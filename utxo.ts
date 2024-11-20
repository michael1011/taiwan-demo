import ops from "@boltz/bitcoin-ops";
import { address, networks, script, Transaction } from "bitcoinjs-lib";
import { ECPairFactory, type ECPairInterface } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import RpcClient from "./RpcClient";

const client = new RpcClient({
    host: "127.0.0.1",
    port: 18443,
    rpcuser: "kek",
    rpcpass: "kek",
});

const ECPair = ECPairFactory(ecc);

const destination = "bcrt1qnh4wf68663hjk345fjpneja0waek84sfpr9lzc";

const keysAlice = ECPair.fromPrivateKey(
    new Uint8Array(
        Buffer.from(
            "48f3542ffd6ebcfa40a2a3251fd95f5387f2fc3e3100fb406d5b373e07c6f817",
            "hex"
        )
    )
);

const keysBob = ECPair.fromPrivateKey(
    new Uint8Array(
        Buffer.from(
            "48f3542ffd6ebcfa40a2a3251fd95f5387f2fc3e3100fb406d5b373e07c6f818",
            "hex"
        )
    )
);

const keysCarol = ECPair.fromPrivateKey(
    new Uint8Array(
        Buffer.from(
            "48f3542ffd6ebcfa40a2a3251fd95f5387f2fc3e3100fb406d5b373e07c6f819",
            "hex"
        )
    )
);

const signWithKeys = (keys: ECPairInterface, hash: Uint8Array) =>
  script.signature.encode(keys.sign(hash), Transaction.SIGHASH_ALL);

(async () => {
    // Create the script
    const opScript = script.compile([
        script.number.encode(2),
        keysAlice.publicKey,
        keysBob.publicKey,
        keysCarol.publicKey,
        script.number.encode(3),
        ops.OP_CHECKMULTISIG,
    ]);
    console.log('OP script:', Buffer.from(opScript).toString("hex"));
    
    // Derive an address
    const output = script.compile(
        [ops.OP_0, sha256(opScript)],
    );
    console.log('Output script:', Buffer.from(output).toString('hex'));

    const addr = address.fromOutputScript(output, networks.regtest);
    console.log('Address:', addr);
    console.log();
    
    // Send to the address
    const transactionId = await client.request<string>('sendtoaddress', [addr, 1.0]);
    console.log('Funded in transaction:', transactionId);

    // Find the output we want to spend
    const fundingTx = Transaction.fromHex(await client.request<string>(
        'getrawtransaction',
        [transactionId],
    ));
    const ourOutputIndex = fundingTx.outs.findIndex((out) => Buffer.from(out.script).equals(output));
    console.log('Our output index:', ourOutputIndex);

    // Spend the UTXO
    const spendingTx = new Transaction();
    spendingTx.addInput(fundingTx.getHash(), ourOutputIndex);
    spendingTx.addOutput(address.toOutputScript(destination, networks.regtest), 99_990_000n);

    const hashForWitness = spendingTx.hashForWitnessV0(
      0,
      opScript,
      fundingTx.outs[ourOutputIndex].value,
      Transaction.SIGHASH_ALL,
    );

    // Sign the transaction
    spendingTx.setWitness(0, [
      new Uint8Array(Buffer.alloc(0)),
      signWithKeys(keysAlice, hashForWitness),
      signWithKeys(keysBob, hashForWitness),
      opScript,
    ]);

    console.log('Spending script:', JSON.stringify(
        spendingTx.ins[0].witness.map((i) => Buffer.from(i).toString("hex")),
        undefined,
        2
    ));
    console.log();

    // And send it
    await client.request<string>("sendrawtransaction", [spendingTx.toHex()]);
    console.log('Spending transaction id:', spendingTx.getId());
})();
