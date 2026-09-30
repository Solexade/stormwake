const wallets=new Map();let selected=null;
window.addEventListener('eip6963:announceProvider',event=>{const d=event.detail;if(d?.provider?.request&&d?.info?.uuid)wallets.set(d.info.uuid,{id:d.info.uuid,name:d.info.name||'Browser wallet',provider:d.provider});});
window.dispatchEvent(new Event('eip6963:requestProvider'));
export function availableWallets(){
 window.dispatchEvent(new Event('eip6963:requestProvider'));
 const result=[...wallets.values()];const legacy=window.ethereum?.providers||[window.ethereum];
 for(const p of legacy){if(!p?.request||result.some(w=>w.provider===p))continue;result.push({id:'legacy-'+result.length,name:p.isRabby?'Rabby':p.isMetaMask?'MetaMask':'Browser wallet',provider:p});}return result;
}
export async function switchTestnet(provider){const chain='0xb626';if(Number(await provider.request({method:'eth_chainId'}))!==46630){try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:chain}]});}catch(e){if(e.code!==4902&&e.data?.originalError?.code!==4902)throw e;await provider.request({method:'wallet_addEthereumChain',params:[{chainId:chain,chainName:'Robinhood Chain Testnet',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:['https://rpc.testnet.chain.robinhood.com'],blockExplorerUrls:['https://explorer.testnet.chain.robinhood.com']}]});}}
 if(Number(await provider.request({method:'eth_chainId'}))!==46630)throw Error('Select Robinhood Chain Testnet in your wallet.');
}
const hex=text=>'0x'+[...new TextEncoder().encode(text)].map(b=>b.toString(16).padStart(2,'0')).join('');
export async function signIn(id,api){const choice=availableWallets().find(w=>w.id===id);if(!choice)throw Error('Wallet not found. Open this site in a browser with Rabby or MetaMask installed.');selected=choice.provider;
 const accounts=await selected.request({method:'eth_requestAccounts'});if(!accounts?.[0])throw Error('Choose an account in your wallet.');await switchTestnet(selected);
 const challenge=await api('auth/challenge',{address:accounts[0]});const signature=await selected.request({method:'personal_sign',params:[hex(challenge.message),accounts[0]]});return api('auth/verify',{nonce:challenge.nonce,signature});
}
function key(wallet){return 'stormwake-arrival-'+wallet?.toLowerCase();}
export function pendingArrival(wallet){try{const data=JSON.parse(localStorage.getItem(key(wallet)));return /^0x[0-9a-fA-F]{64}$/.test(data?.hash||'')?data:null;}catch{return null;}}
export async function sendArrival(wallet,api){if(!selected)throw Error('Connect your wallet again before recording your arrival.');await switchTestnet(selected);const accounts=await selected.request({method:'eth_accounts'});if(accounts?.[0]?.toLowerCase()!==wallet.toLowerCase())throw Error('Select the same wallet account used for this profile.');const challenge=await api('arrival/challenge',{});if(challenge.recorded)return {recorded:challenge.recorded};
 const hash=await selected.request({method:'eth_sendTransaction',params:[{from:wallet,to:wallet,value:'0x0',data:challenge.data,chainId:'0xb626'}]});const pending={hash,nonce:challenge.nonce};try{localStorage.setItem(key(wallet),JSON.stringify(pending));}catch{}return pending;
}
export async function verifyArrival(wallet,api){const pending=pendingArrival(wallet);if(!pending)throw Error('No pending check-in in this browser.');const result=await api('arrival/verify',pending);if(!result.pending){try{localStorage.removeItem(key(wallet));}catch{}}return result;}
export function forgetWallet(){selected=null;}
export function walletError(error){if(error.code===4001||error.code==='ACTION_REJECTED')return 'Wallet request cancelled. Nothing was approved.';if(error.code===-32002)return 'A wallet request is already open. Check your wallet extension.';return error.shortMessage||error.message||'The wallet request could not be completed.';}
