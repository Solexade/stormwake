import {randomBytes} from 'node:crypto';
import {getAddress,verifyMessage} from 'viem';
export const CHAIN={id:46630,hex:'0xb626',name:'Robinhood Chain Testnet',rpc:'https://rpc.testnet.chain.robinhood.com',explorer:'https://explorer.testnet.chain.robinhood.com',faucet:'https://faucet.testnet.chain.robinhood.com/'};
export function loginChallenge(address,origin,now=Date.now()){
 const wallet=getAddress(address),nonce=randomBytes(24).toString('hex'),expires=now+300000;
 const message=`${new URL(origin).host} wants you to sign in with your Ethereum account:\n${wallet}\n\nSign in to Stormwake Hearthhall. This signature authenticates your profile; it is not an onchain transaction or token approval.\n\nURI: ${origin}\nVersion: 1\nChain ID: ${CHAIN.id}\nNonce: ${nonce}\nIssued At: ${new Date(now).toISOString()}\nExpiration Time: ${new Date(expires).toISOString()}`;
 return {wallet:wallet.toLowerCase(),nonce,message,expires};
}
export async function validSignature(entry,signature,now=Date.now()){
 if(!entry||entry.expires<now||typeof signature!=='string'||!/^0x[0-9a-fA-F]{130}$/.test(signature))return false;
 try{return await verifyMessage({address:entry.wallet,message:entry.message,signature});}catch{return false;}
}
export function arrivalChallenge(wallet,now=Date.now()){
 const nonce=randomBytes(24).toString('hex');const memo=`STORMWAKE_HEARTHHALL_V1:${CHAIN.id}:${nonce}`;
 return {nonce,wallet:wallet.toLowerCase(),data:'0x'+Buffer.from(memo,'utf8').toString('hex'),expires:now+86400000};
}
export async function rpc(method,params=[]){const response=await fetch(CHAIN.rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Robinhood testnet RPC is temporarily unavailable.');const json=await response.json();if(json.error)throw Error('Robinhood testnet could not verify the transaction.');return json.result;}
export function checkArrival(entry,tx,receipt,chainId){
 if(Number(chainId)!==CHAIN.id)throw Error('The receipt must be on Robinhood Chain Testnet.');
 if(!tx||!receipt||!receipt.blockNumber)return {pending:true};
 if(receipt.status!=='0x1')throw Error('The transaction failed onchain.');
 if(tx.from?.toLowerCase()!==entry.wallet||tx.to?.toLowerCase()!==entry.wallet||BigInt(tx.value||'0x0')!==0n||tx.input?.toLowerCase()!==entry.data.toLowerCase()||tx.hash?.toLowerCase()!==receipt.transactionHash?.toLowerCase())throw Error('This transaction does not match your safehouse check-in.');
 return {pending:false,hash:tx.hash,block:parseInt(receipt.blockNumber,16)};
}
