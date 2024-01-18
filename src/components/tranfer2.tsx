import React, { useState } from 'react';

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
  const signature = await connection.sendRawTransaction(signed[0].serialize());
  return signature;
};

const SendSolanaSplTokens = () => {

  const [revieverAddress, setRevieverAddress] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);


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
      // const recipientAddress = new PublicKey(
      //   "GN5yB98Ln85rJSq2sJC1CqouAYfruzuFZKcFpM1eYVEV"
      // );

      const transactionInstructions: TransactionInstruction[] = [];
      const associatedTokenFrom = await getAssociatedTokenAddress(
        mintToken,
        publicKey
      );
      const fromAccount = await getAccount(connection, associatedTokenFrom);
      const associatedTokenTo = await getAssociatedTokenAddress(
        mintToken,
        new PublicKey(revieverAddress)
      );
      if (!(await connection.getAccountInfo(associatedTokenTo))) {
        transactionInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            associatedTokenTo,
            new PublicKey(revieverAddress),
            mintToken
          )
        );
      }
      transactionInstructions.push(
        createTransferInstruction(
          fromAccount.address, // source
          associatedTokenTo, // dest
          publicKey,
          amount * 1000000000 // transfer 1 USDC, USDC on solana devnet has 6 decimal
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
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <h1>Send solana spl tokens</h1>
      <input type="text" value={revieverAddress} onChange={(e) => setRevieverAddress(String(e.target.value))} />
      <br />
      <input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value))} />
      <br />
      <button onClick={handlePayment}>Transfer spl token</button>
    </div>
  );
};

export default SendSolanaSplTokens;
