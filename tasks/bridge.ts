import { task } from "hardhat/config";
import { ethers } from "hardhat";
import "@nomiclabs/hardhat-waffle";
import 'dotenv/config';

const BRIDGE_ETH_ADDRESS = `${process.env.BRIDGE_ETH_ADDRESS}`;
const BRIDGE_BSC_ADDRESS = `${process.env.BRIDGE_BSC_ADDRESS}`;

task("swap", "Swap tokens from the network")
    .addParam("from", "Sender address")
    .addParam("to", "Recipient address")
    .addParam("amount", "Amount of tokens to swap")
    .addParam("chainFrom", "Sender network ID")
    .addParam("chainTo", "Recipient network ID")
    .addParam("nonce", "Some nonce")
    .addParam("symbol", "Token symbol")
    .setAction(async (args, hre) => {
        const bridge = await hre.ethers.getContractAt("Bridge", BRIDGE_ETH_ADDRESS);
        const signer = await hre.ethers.getSigner(args.from);
        await bridge.connect(signer).swap(
            args.to,
            args.amount,
            args.chainFrom,
            args.chainTo,
            args.nonce,
            args.symbol
        );
        console.log(`Swapped ${args.amount} of tokens for ${args.to}.`);
    });

task("redeem", "Redeem tokens from the network")
    .addParam("from", "Sender address")
    .addParam("to", "Recipient address")
    .addParam("amount", "Amount of tokens to swap")
    .addParam("chainFrom", "Sender network ID")
    .addParam("chainTo", "Recipient network ID")
    .addParam("nonce", "Some nonce")
    .addParam("symbol", "Token symbol")
    .setAction(async (args, hre) => {
        const bridge = await hre.ethers.getContractAt("Bridge", BRIDGE_BSC_ADDRESS);
        const signer = await hre.ethers.getSigner(args.from);
        let msg = ethers.utils.solidityKeccak256(
            ["address", "uint256"], [signer.address, 100]);

        let signature = await signer.signMessage(ethers.utils.arrayify(msg));
        let sig = ethers.utils.splitSignature(signature);
        await bridge.connect(signer).redeem(
            args.to,
            args.amount,
            args.chainFrom,
            args.chainTo,
            args.nonce,
            args.symbol,
            sig.v,
            sig.r,
            sig.s
        );
        console.log(`Redeemed ${args.amount} of tokens for ${args.to}.`);
    });
