import React from "react";
import {
  WalletNotConnectedError,
  SignerWalletAdapterProps,
} from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import {
  PublicKey,
  Transaction,
  Connection,
  TransactionInstruction,
} from "@solana/web3.js";


const configureAndSendCurrentTransaction = async (
  transaction: Transaction,
  connection: Connection,
  feePayer: PublicKey,
  signTransaction: SignerWalletAdapterProps["signTransaction"]
) => {
  const provider = new PhantomWalletAdapter();
  provider.connect();
  const blockHash = await connection.getLatestBlockhash();
  transaction.feePayer = feePayer;
  transaction.recentBlockhash = blockHash.blockhash;
  console.log("transaction", transaction);

  const signed = await provider.signAllTransactions([transaction]);
  console.log("signed", signed[0].signatures[0].signature?.toString());
  const signature = await connection.sendRawTransaction(signed[0].serialize());
  console.log("signature", signature);
  // return signed;
  // const signature = await connection.sendRawTransaction(signed.serialize());
  // console.log("signature", signature);
  // await connection.confirmTransaction({
  //   blockhash: blockHash.blockhash,
  //   lastValidBlockHeight: blockHash.lastValidBlockHeight,
  //   signed,
  // });
  // const signature = await connection.confirmTransaction(signed[0].signature);
  return signature;
};

const SendSolanaSplTokens = () => {



  const provider = new PhantomWalletAdapter();
  provider.connect();
  const publicKey = provider.publicKey;
  const signTransaction = provider.signTransaction;
  // make phantom wallet connect to solana devnet
  const connection = new Connection("https://api.devnet.solana.com");

  const handlePayment = async () => {
    try {
      
      console.log("provider", provider);
      console.log("connection", connection);
      console.log("publicKey", publicKey);
      if (!publicKey || !signTransaction) {
        throw new WalletNotConnectedError();
      }
      const mintToken = new PublicKey(
        "Ak6SpkzdXPNKMjqyMHZ1niQqFWMDGWrNsdG4Tu2bYZKq"
      ); // 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU is USDC token address on solana devnet
      const recipientAddress = new PublicKey(
        "GN5yB98Ln85rJSq2sJC1CqouAYfruzuFZKcFpM1eYVEV"
      );

      const transactionInstructions: TransactionInstruction[] = [];
      const associatedTokenFrom = await getAssociatedTokenAddress(
        mintToken,
        publicKey
      );
      const fromAccount = await getAccount(connection, associatedTokenFrom);
      const associatedTokenTo = await getAssociatedTokenAddress(
        mintToken,
        recipientAddress
      );
      if (!(await connection.getAccountInfo(associatedTokenTo))) {
        transactionInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            associatedTokenTo,
            recipientAddress,
            mintToken
          )
        );
      }
      transactionInstructions.push(
        createTransferInstruction(
          fromAccount.address, // source
          associatedTokenTo, // dest
          publicKey,
          10000000 // transfer 1 USDC, USDC on solana devnet has 6 decimal
        )
      );
      const transaction = new Transaction().add(...transactionInstructions);


      const signature = await configureAndSendCurrentTransaction(
        transaction,
        connection,
        publicKey,
        provider.signTransaction
      );

      console.log("signature", signature);
      // signature is transaction address, you can confirm your transaction on 'https://explorer.solana.com/?cluster=devnet'
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <button onClick={handlePayment}>Transfer spl token</button>
    </div>
  );
};

export default SendSolanaSplTokens;
