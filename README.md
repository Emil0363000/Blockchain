# Documentation

## Introduction

## Objectifs
  - Connecter un utilisateur avec MetaMask
  - Récupérer une adresse Ethereum
  - Envoyer une transaction
  - Gérer un cooldown entre les actions
  - Écouter les événements en temps réel
  - Lire l’historique des transactions

## Stacks techniques
  - React
  - Ethers.js
  - MetaMask
  - Solidity
  - Sepolia

## Cloner le projet 
git clone https://github.com/Emil0363000/Blockchain.git

# Analyse:

## Observation de l'interfce 

### Ce que vous voyez sans wallet 
Les résultats du vote s'affichent sans être connecté. Cela est possible car on lit seulement la blockchain qui est publique. 
Cela est possible grâce à la transparence de la blockchain.

Tous les éléments suivants sont présents sans wallet: 
  - Adresse du contrat déployé
  - Lien vers Etherscan
  - Nombre de votes par candidat
  - Historique des transactions
  - Explication du fonctionnement

### Connexion Metamask
Notre numéro de wallet s'affiche après connexion. Metamask ne m'a pas demandé de mot de passe. 
Le modèle d'authentification du web3 repose par l'authentification cryptographique et non pas par mdp comme le web2.

## Voter et observer la transaction

### Envoyer un vote 
L'adresse du smartcontract est indiquée dans le popup. Le cout en gas estimé est d'environ 0,0001 ETH.
Chaque opération a un coût en gas. Le vote modifie l’état de la blockchain nécessitant une exécution payante.

### Analyser la transaction confirmée
Le gasused est le gas réelement utilisé pour la transaction. Le gaslimit est une limite max fixée par l'utilisateur.

### Cooldown de 3 minutes
On ne peut pas voter une seconde fois, il faut attrendre 3 minutes.
Ceci vient du smartcontract on pourrait modifier le frontend sinon pour le tromper ou changer de fuseau horaire.
La variable block.timestamp permet ceci.
## Investigation on-chain via Etherscan 

### Onglet "Transactions"
Le moment de la première transaction est: 17/03/2026 à 8h.
C'est car elle correspond au déploiement du contrat et les autres au vote.

### Onglet "Events"
Le nom de l'event est Voted. 
L'adresse du votant et le numéro de candidat du candidat choisi sont en paramètres.
Un event enregistre une action dans la blockchain, facilement consultables sans coût élevé.
Une variable d’état est stockée sur la blockchain et coûte plus cher à modifier.

### Onglet "Contract"
Le code source est visibble. Le block block.timestamp vérifie le cooldown de 3 minutes. 
Si la condition n'est pas respectée, la transaction est rejetée. 

### Analyse d'un bloc via le Blockchain Explorer de l'app
Le parentHash est le hash du bloc précédent. Il relie les blocs entre eux.
Il garantit l’immuabilité.

## Analyse critique

### Ce que la blockchain apporte ici

Immuabilité — les votes ne peuvent pas être modifiés: Oui 
Transparence — n'importe qui peut vérifier les résultats: Oui 
Désintermédiation — pas de serveur central: Oui
Décentralisation — pas d'entité de contrôle: Oui 

### Ce que la blockchain n'apporte pas
L'anonymité totale, il y a une adresse publique qui est reliée au transaction donc pas anonyme.
Un utilisateur technique pourrait contourner le cooldown via plusieurs wallets. 
