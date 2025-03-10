import { useWallet } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import * as token from "@solana/spl-token";
import React, { useState } from "react";
import './Mint.css'

const MintFunction = () => {
    const wallet = useWallet();

    const [formData, setFormData] = useState({
        name: "",
        symbol: "",
        decimals: 9,
        supply: 0,
        description: ""
    });
    const [network, setNetwork] = useState("devnet");
    const [isLoading, setIsLoading] = useState(false);
    const [tokenAddress, setTokenAddress] = useState("");
    const [mintAddresses, setMintAddresses] = useState<string[]>([]);
    const [showPopup, setShowPopup] = useState(false);
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"), "confirmed");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: name === "decimals" || name === "supply" ? parseInt(value) || 0 : value,
        }));
    };

    async function getTokensFromAddress(walletAddress : string){
        const pubKey = new web3.PublicKey(walletAddress);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey , {programId: token.TOKEN_PROGRAM_ID});

        const tokens = tokenAccounts.value.map((account) => {
            const info = account.account.data.parsed.info;
            return info.mint;
        });
        setMintAddresses(tokens);
        setShowPopup(true);

    }

    async function createMintTransaction() {
        if (!wallet.publicKey) {
            alert("Please connect your wallet!");
            throw new Error("Please Connect to your Wallet");
        }

        setIsLoading(true);
        const mintKeypair = web3.Keypair.generate();
    

        try {
            const lamports = await token.getMinimumBalanceForRentExemptMint(connection);
            const ProgramId = token.TOKEN_PROGRAM_ID;

            const transaction = new web3.Transaction().add(
                web3.SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: token.MINT_SIZE,
                    lamports,
                    programId: ProgramId,
                }),
                token.createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    Number(formData.decimals),
                    wallet.publicKey,
                    wallet.publicKey,
                    ProgramId
                )
            );

            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            if (wallet.signTransaction) {
                transaction.partialSign(mintKeypair);
                const signedTransaction = await wallet.signTransaction(transaction);
                const txHash = await connection.sendRawTransaction(signedTransaction.serialize());
                alert(`Token Minted Successfully! Transaction hash: ${txHash}`);
                console.log(`Token Minted Successfully! Token Address: ${mintKeypair.publicKey.toBase58()}`);
                setTokenAddress(mintKeypair.publicKey.toBase58());
            } else {
                alert("Phantom wallet does not support transaction signing.");
                throw new Error("Phantom wallet cannot sign transactions.");
            }
        } catch (error) {
            console.error("Minting Error:", error);
            alert("Minting failed! Check console for details.");
            setIsLoading(false);
            return;
        }

        try {
            const associatedTokenAddress = await token.getAssociatedTokenAddress(
                mintKeypair.publicKey,
                wallet.publicKey,
                false
            );

            const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
            if (!accountInfo) {
                const ataTransaction = new web3.Transaction().add(
                    token.createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        associatedTokenAddress,
                        wallet.publicKey,
                        mintKeypair.publicKey
                    )
                );

                ataTransaction.feePayer = wallet.publicKey;
                ataTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                const signedAtaTransaction = await wallet.signTransaction(ataTransaction);
                const ataTxHash = await connection.sendRawTransaction(signedAtaTransaction.serialize());
                alert(`Associated Token Account Successfully Created! Transaction: ${ataTxHash}`);
                console.log(`Associated Token Account address: ${associatedTokenAddress.toBase58()}`);
                console.log(ataTxHash);
            }

            const mintToTransaction = new web3.Transaction().add(
                token.createMintToInstruction(
                    mintKeypair.publicKey,
                    associatedTokenAddress,
                    wallet.publicKey,
                    BigInt(formData.supply) * BigInt(10) ** BigInt(formData.decimals),
                    []
                )
            );

            mintToTransaction.feePayer = wallet.publicKey;
            mintToTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedMintToTransaction = await wallet.signTransaction(mintToTransaction);
            const mintToTxHash = await connection.sendRawTransaction(signedMintToTransaction.serialize());
            console.log(`Tokens Minted! Tx: ${mintToTxHash}`);
            alert(`Tokens Minted Successfully! Transaction: ${mintToTxHash}`);
        } catch (error) {
            console.error("Associated token formation Error:", error);
            alert("Associated token formation failed! Check console for details.");
        }

        setIsLoading(false);
    }

    return (
        <div className='form'>
            <select name="network" value={network} onChange={(e) => setNetwork(e.target.value)}>
                <option value="devnet">Devnet</option>
                <option value="testnet">Testnet</option>
                <option value="mainnet-beta">Mainnet</option>
            </select>
            <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} />
            <input type="text" name="symbol" placeholder="Symbol" value={formData.symbol} onChange={handleChange} />
            <input type="number" name="decimals" placeholder="Decimals" value={formData.decimals} onChange={handleChange} />
            <input type="number" name="supply" placeholder="Supply" value={formData.supply} onChange={handleChange} />
            <input type="text" name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
            <button className="mintButton" onClick={createMintTransaction} disabled={isLoading}>
                {isLoading ? "Minting..." : "Create Mint"}
            </button>
        <button onClick={() => wallet.publicKey && getTokensFromAddress(wallet.publicKey.toBase58()).then(console.log)}>Get Tokens of your Account</button>
            {tokenAddress && <p>Token Address: {tokenAddress}</p>}

            {showPopup && (
                <div className="popup">
                    <div className="popup-content">
                        <span className="close" onClick={() => setShowPopup(false)}>&times;</span>
                        <h3>Your Token Mint Addresses</h3>
                        <ul>
                            {mintAddresses.map((mint, index) => (
                                <li key={index}>{mint}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
        
    );
};

export default MintFunction;
