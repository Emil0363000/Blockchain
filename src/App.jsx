import { useState, useEffect } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import ABI from './abi.json'
import { CONTRACT_ADDRESS, EXPECTED_CHAIN_ID, EXPECTED_NETWORK_NAME } from './config'
import './index.css'
import './styles.css'
import imgLeonBlum   from '../img/leon_blum.png'
import imgChirac     from '../img/chiraq.png'
import imgMitterrand from '../img/miterrand.png'

const CANDIDATE_NAMES = ['Léon Blum', 'Jacques Chirac', 'François Mitterrand']
const CANDIDATE_IMGS  = [imgLeonBlum, imgChirac, imgMitterrand]

function App() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [error, setError] = useState(null)
  const [isVoting, setIsVoting] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [txHash, setTxHash] = useState(null)
  const [lastBlockNumber, setLastBlockNumber] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)
  const [explorerEvents, setExplorerEvents] = useState([])
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [explorerLoading, setExplorerLoading] = useState(false)

const loadExplorerEvents = async () => {
  if (!provider) return;
  setExplorerLoading(true);
  try {
    const ec = new Contract(CONTRACT_ADDRESS, ABI, provider);
    const raw = await ec.queryFilter(ec.filters.ActionEffectuee(), -1000);
    const last20 = raw.slice(-20).reverse();
    const enriched = await Promise.all(last20.map(async (e) => {
      const valeur = Number(e.args.valeur); // ← "valeur" pas "candidateIndex"
      const voter  = e.args.qui;            // ← "qui" pas "voter"
      let timestamp = null, gasUsed = null;
      try {
        const block = await provider.getBlock(e.blockNumber);
        timestamp = block?.timestamp ?? null;
      } catch {}
      try {
        const receipt = await provider.getTransactionReceipt(e.transactionHash);
        gasUsed = receipt?.gasUsed != null ? Number(receipt.gasUsed) : null;
      } catch {}
      return {
        hash: e.transactionHash,
        blockNumber: e.blockNumber,
        voter,
        candidateName: `+${valeur} au compteur`, // pas de candidat, on affiche la valeur
        timestamp,
        gasUsed,
      };
    }));
    setExplorerEvents(enriched);
  } catch {
    setExplorerEvents([]);
  } finally {
    setExplorerLoading(false);
  }
}

  useEffect(() => {
  if (explorerOpen && provider) loadExplorerEvents()
}, [explorerOpen])

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return
      try {
        const p = new BrowserProvider(window.ethereum)
        setProvider(p)
        await loadCandidates(p) 
        } catch { }
      }
      init()
}, [])

const loadCandidates = async (_provider) => {
  try {
    // 🔍 DIAGNOSTIC — à supprimer après
    const network = await _provider.getNetwork()
    console.log("Réseau détecté :", network.chainId.toString(), network.name)
    console.log("Adresse contrat :", CONTRACT_ADDRESS)
    // fin diagnostic

    const contrat = new Contract(CONTRACT_ADDRESS, ABI, _provider);
    const valeur = await contrat.compteur();
    setCandidates([{ id: 0, name: "Compteur Global", votes: Number(valeur) }]);
  } catch (err) {
    console.error("Erreur lecture compteur:", err);
  }
}
const vote = async (unusedIndex) => {
  try {
    setIsVoting(true);
    setError(null);
    const signer = await provider.getSigner();
    const contrat = new Contract(CONTRACT_ADDRESS, ABI, signer);
    const tx = await contrat.agir(1); // ← nom exact dans ton ABI
    setTxHash(tx.hash);
    const receipt = await tx.wait();
    setLastBlockNumber(receipt.blockNumber);
    await loadCandidates(provider);
  } catch (err) {
    if (err.message?.includes("Attends 1 minute")) {
      setError("Patience ! Vous ne pouvez agir qu'une fois par minute.");
      setCooldownSeconds(60);
    } else {
      setError(err.code === 4001 ? "Transaction annulée." : "Erreur : " + err.message);
    }
  } finally {
    setIsVoting(false);
  }
}

const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask n'est pas installé.")
        return
      }

      const _provider = new BrowserProvider(window.ethereum)
      await _provider.send("eth_requestAccounts", [])

      const network = await _provider.getNetwork()
      if (network.chainId !== BigInt(EXPECTED_CHAIN_ID)) {
        setError(`Mauvais réseau — connectez MetaMask sur ${EXPECTED_NETWORK_NAME}.`)
        return
      }

      const signer = await _provider.getSigner()
      const address = await signer.getAddress()

      setAccount(address)
      setProvider(_provider)
      setError(null)

      await loadCandidates(_provider)
    } catch {
      setError("Connexion refusée.")
    }
  }

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer) // cleanup obligatoire
  }, [cooldownSeconds])

  useEffect(() => {
  if (!provider) return
  let listenContract
  try {
    listenContract = new Contract(CONTRACT_ADDRESS, ABI, provider)

    const handler = (qui, valeur) => { // ← noms exacts de l'event dans l'ABI
  setLastEvent({
    voter: qui.slice(0, 6) + '...' + qui.slice(-4),
    candidateName: `a ajouté ${Number(valeur)} au compteur`
  });
  loadCandidates(provider);
}
listenContract.on("ActionEffectuee", handler);
return () => { listenContract.off("ActionEffectuee", handler); } // ← bug corrigé : "Voted" → "ActionEffectuee"
  } catch (err) {
    console.warn("Impossible d'écouter les events :", err.message)
  }
}, [provider])


 return (
  <div>
    <h1>Élection Présidentielle On-Chain</h1>

    {!account ? (
      <button onClick={connectWallet}>
        Connecter MetaMask
      </button>
    ) : (
      <p>
        Connecté : <strong>{account}</strong> · {EXPECTED_NETWORK_NAME}
      </p>
    )}

    {error && <p style={{ color: 'red' }}>⚠ {error}</p>}

    {cooldownSeconds > 0 && (
      <div>
        <p>⏳ Prochain vote disponible dans :</p>
        <p style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 'bold' }}>
          {String(Math.floor(cooldownSeconds / 60)).padStart(2, '0')}:
          {String(cooldownSeconds % 60).padStart(2, '0')}
        </p>
        <p style={{ fontSize: '12px', color: 'gray' }}>
          La blockchain enregistre l'heure de votre dernier vote
        </p>
      </div>
    )}

    {lastEvent && (
      <div style={{ background: '#f0fff0', padding: '10px', borderRadius: '8px', margin: '10px 0' }}>
         Nouveau vote — <strong>{lastEvent.voter}</strong> a voté pour <strong>{lastEvent.candidateName}</strong>
      </div>
    )}

    {candidates.map(c => (
      <div key={c.id}>
        <strong>{c.name}</strong> — {c.votes} vote(s)

        {account && cooldownSeconds === 0 && (
          <button
            onClick={() => vote(c.id)}
            disabled={isVoting}
          >
            {isVoting ? '⏳ En cours...' : 'Voter →'}
          </button>
        )}
      </div>
    ))}

    <div style={{ marginTop: '20px' }}>
      <button onClick={() => setExplorerOpen(o => !o)}>
        {explorerOpen ? 'Masquer' : '⛓ Blockchain Explorer'}
      </button>
      {explorerOpen && (
        <div style={{ marginTop: '10px', overflowX: 'auto' }}>
          {explorerLoading ? (
            <p>Chargement des données on-chain...</p>
          ) : explorerEvents.length === 0 ? (
            <p>Aucun vote enregistré pour l'instant.</p>
          ) : (
            <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Tx Hash</th>
                  <th>Bloc</th>
                  <th>Votant</th>
                  <th>Candidat</th>
                  <th>Heure</th>
                  <th>Gas utilisé</th>
                </tr>
              </thead>
              <tbody>
                {explorerEvents.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <a href={`https://sepolia.etherscan.io/tx/${e.hash}`} target="_blank" rel="noopener noreferrer">
                        {e.hash.slice(0, 10)}...{e.hash.slice(-6)}
                      </a>
                    </td>
                    <td>{e.blockNumber}</td>
                    <td>{e.voter.slice(0, 10)}...{e.voter.slice(-6)}</td>
                    <td>{e.candidateName}</td>
                    <td>{e.timestamp ? new Date(e.timestamp * 1000).toLocaleString('fr-FR') : '—'}</td>
                    <td>{e.gasUsed ? `${e.gasUsed.toLocaleString()} unités` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>

    {txHash && <p>Transaction envoyée : {txHash}</p>}
    {lastBlockNumber && <p>✅ Incluse dans le bloc #{lastBlockNumber}</p>}
  </div>
);
}
export default App;