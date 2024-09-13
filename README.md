# Projet Chat

## Project Members

- JORRE Alexis
- LORGET Gabriel
- BOULBEN Guillaume
- TRICOIRE Hugo

## Rapport de Conception de l'Architecture

### 1. Aperçu du Projet

Ce projet est une application de chat basée sur le web, structurée en composants frontend et backend. Il utilise Node.js pour les opérations côté serveur et sert des fichiers statiques pour l'interface de chat. Docker est utilisé pour containeriser l'application, garantissant une mise en production et une évolutivité sans accroc.

### 2. Composants Clés

Frontend :
Fichiers HTML (chat.html et index.html) qui fournissent la structure de l'interface utilisateur de l'application.
Fichiers CSS (style-chat.css et style-index.css) qui définissent le style de l'interface de chat et de la page d'accueil, assurant un design réactif.
Backend :
server.js : Le fichier backend principal, gérant les requêtes et les connexions WebSocket pour la fonctionnalité de chat en temps réel.
Configuration :
Le fichier docker-compose.yml orchestre les conteneurs Docker, garantissant que l'application peut être exécutée de manière cohérente dans différents environnements.

### 3. Flux de Travail

Interaction Utilisateur : Les utilisateurs interagissent avec le frontend via les pages index.html et chat.html.
Communication Serveur : Le frontend communique avec le backend Node.js, qui gère les requêtes, la communication en temps réel, et sert les fichiers statiques.
Containerisation : Docker fournit un environnement isolé pour l'application, simplifiant son déploiement.

### 4. Technologies Utilisées

Node.js : Serveur backend pour gérer les requêtes et les connexions WebSocket.
Docker : Plateforme de containerisation pour un déploiement cohérent.
HTML/CSS : Structure et style du frontend.
WebSockets : Probablement utilisé pour la fonctionnalité de chat en temps réel.
Documentation Technique

### 1. Installation et Configuration

Pré-requis :

Node.js (v14 ou supérieur)
Docker (v20+)

Utilisation de Docker : Assurez-vous que Docker est installé et en cours d'exécution. Ensuite, exécutez :
```bash
docker-compose up
```
Cela mettra en place l'application dans un conteneur Docker.

Exécution Locale : Ouvrez ces pages web :
```bash
localhost:3000 #Interface du Chat
```
```bash
localhost:15672 #Interface du Chat
```

### 2. Structure du Projet

Frontend :
public/ : Contient les fichiers statiques pour l'interface de chat et la page d'accueil.
chat.html : Interface de chat.
index.html : Page d'accueil.
style-chat.css : Styles pour la page de chat.
style-index.css : Styles pour la page d'accueil.
Backend :
server.js : Le serveur Node.js qui gère les connexions WebSocket et sert les fichiers statiques.

### 3. Points d'API

Le serveur gère les requêtes relatives à la fonctionnalité de chat, probablement en fournissant des endpoints pour la communication en temps réel via WebSockets.

### 4. Configuration Docker

Le fichier docker-compose.yml définit les services Docker nécessaires à l'exécution de l'application dans un environnement isolé. Pour modifier ou ajouter des services, ajustez la section services de ce fichier.