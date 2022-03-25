import { ethers } from "hardhat";
import 'dotenv/config';

async function main() {
    let msg = ethers.utils.solidityKeccak256(
        ["address", "uint256"], [`${process.env.WALLET_PUBLIC_KEY}`, ethers.utils.parseEther("100")]);
    let wallet = new ethers.Wallet(`${process.env.WALLET_PRIVATE_KEY}`);
    let signature = await wallet.signMessage(ethers.utils.arrayify(msg));
    let sig = ethers.utils.splitSignature(signature);
    console.log("r:", sig.r);
    console.log("s:", sig.s);
    console.log("v", sig.v);
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });