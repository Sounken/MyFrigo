# MyFrigo

Inventaire de frigo par scan de codes-barres. Une seule app AdonisJS (Inertia +
React), SQLite, déployée sur Coolify derrière `myfrigo.movietracker.fr`.

## Les deux flux

**Entrée — scan en rafale.** La caméra reste ouverte d'un article à l'autre ;
seul le _décodage_ se met en pause pendant qu'on confirme la date, pour qu'une
popup ne s'empile jamais derrière une autre. La date est pré-remplie et
validable en un tap.

**Sortie — un seul geste.** Swipe gauche « mangé », swipe droite « jeté »,
avec 5 secondes pour annuler. Rien n'est supprimé : les lignes changent de
statut, ce qui rend l'annulation possible, alimente les stats de gaspillage, et
conserve l'historique dont l'estimateur a besoin.

## L'estimation des dates de péremption

Une durée fixe par produit ne marche pas : le même yaourt acheté deux fois peut
avoir quinze jours devant lui une semaine et sept la suivante, selon le temps
passé en rayon.

On n'enregistre donc jamais « ce produit tient N jours ». On enregistre, sur
**chaque exemplaire**, combien de jours restaient au moment du scan
(`items.remaining_days`), et on relit cet historique :

| Historique | Estimation proposée                                         |
| ---------- | ----------------------------------------------------------- |
| aucun      | règle par catégorie Open Food Facts (`shelf_life_rules.ts`) |
| 1 achat    | la valeur observée, « la dernière fois »                    |
| 2+ achats  | la **médiane**, plus le min et le max s'ils s'en écartent   |

Les chips de la popup sont donc des dates réellement observées sur ce produit.
Frigo et congélateur gardent des historiques séparés : congeler écrase la date
imprimée, l'un ne dit rien de l'autre.

## Codes-barres

- EAN-13 / EAN-8 / UPC-A, checksum GS1 vérifié — un mauvais chiffre de contrôle
  est traité comme une **mauvaise lecture**, pas comme un produit inconnu.
- Préfixe `2` = étiquette générée en magasin (produit pesé ou à la coupe). Le
  code encode un poids ou un prix et ne vaut rien ailleurs : aucun appel API,
  saisie directe, avec rappel des produits déjà nommés ainsi.
- `app/services/barcode.ts` renvoie déjà un champ `expiresAt` (toujours `null`)
  pour accueillir les codes 2D GS1 Sunrise 2027, qui porteront le lot et la
  date. Seul ce fichier changera.

## Open Food Facts

Cache **côté serveur** dans la table `products` : la règle « 1 appel API =
1 scan réel » tient quel que soit l'appareil, et un re-scan ne touche jamais le
réseau. User-Agent au format imposé, champs filtrés, panne réseau dégradée en
saisie manuelle. Données sous licence ODbL, attribution affichée dans l'app.

## Contraintes iOS à connaître

- `BarcodeDetector` n'existe pas sur Safari → décodage en WebAssembly
  (`zxing-wasm`), servi depuis notre propre origine.
- La caméra exige **HTTPS** (sauf sur `localhost`).
- Le **Web Push ne fonctionne que si l'app est ajoutée à l'écran d'accueil**.
  Depuis un onglet Safari, aucune notification n'arrivera jamais — l'app
  l'explique au lieu d'afficher un bouton qui échouerait en silence.
- Pas d'API Vibration : le retour de scan est sonore.

## Développement

```bash
npm install
node ace migration:run
node ace db:seed        # frigo de démo, bloqué hors développement
npm run dev             # http://localhost:3333
```

Mot de passe local : `myfrigo`.

Pour tester le scan depuis l'iPhone en local, il faut du HTTPS : passer par un
tunnel (`cloudflared tunnel --url http://localhost:3333`) ou tester directement
sur le domaine déployé.

## Commandes

| Commande                     | Rôle                                     |
| ---------------------------- | ---------------------------------------- |
| `node ace password:hash "…"` | Génère `APP_PASSWORD_HASH`               |
| `node ace push:keys`         | Génère la paire VAPID                    |
| `node ace notify:expiring`   | Envoie le récap des produits à consommer |
| `node ace db:seed`           | Frigo de démonstration                   |

## Déploiement de test sur Coolify

L'app est une image Docker unique. Coolify gère le reverse proxy et le
certificat TLS. Pour le premier essai, utiliser un environnement **staging** et
un sous-domaine distinct de la future production.

**Prérequis** — le code doit être commité et poussé sur GitHub : Coolify clone le
dépôt distant et ne voit jamais les fichiers qui restent seulement sur le Mac.

**1. Ressource** — dans le projet Coolify, créer l'environnement `staging`, puis
_New Resource_ → _Public Repository_ → `https://github.com/Sounken/MyFrigo`.
Choisir la branche qui contient l'application, le build pack **Dockerfile**, le
Dockerfile `/Dockerfile` et la base directory `/`.

**2. Réseau** — renseigner **Port Exposes = `3333`**. Aucun _Port Mapping_ vers
l'hôte n'est nécessaire : Coolify joint directement le conteneur par son proxy.

**3. Domaine de test** — utiliser par exemple
`https://myfrigo-test.movietracker.fr` dans _Domains_. Le certificat est émis
automatiquement. Créer auparavant l'enregistrement DNS `myfrigo-test` pointant
vers l'adresse publique de la VM Coolify.

**4. Volume persistant** — _Storages_ → _Add_ → _Volume Mount_, avec un nom
comme `myfrigo-staging-data` et la destination `/app/storage`. **Sans ce volume,
chaque redéploiement recrée un frigo vide.** Ne jamais partager ce volume entre
staging et production.

**5. Variables d'environnement** (voir `.env.example`) :

```
APP_KEY=              # node ace generate:key
APP_PASSWORD_HASH=    # node ace password:hash "…" — version NON échappée ici
AUTH_DISABLED=false   # true uniquement pour une phase de test sans connexion
DB_PATH=/app/storage/db.sqlite3
TZ=Europe/Paris
NODE_ENV=production
SESSION_DRIVER=cookie
OFF_USER_AGENT=MyFrigo/1.0 (deuleydamien@gmail.com)
VAPID_PUBLIC_KEY=     # node ace push:keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:deuleydamien@gmail.com
```

Ces variables ne servent qu'au conteneur en cours d'exécution : dans la vue
normale de Coolify, garder **Runtime Variable** et désactiver **Build Variable**,
en particulier pour `APP_KEY`, `APP_PASSWORD_HASH` et les clés VAPID.

> Le hash scrypt contient des `$`. Dans un **fichier .env** il faut les échapper
> en `\$`, sinon dotenv les remplace par du vide et aucun mot de passe ne
> passera. Dans l'UI Coolify, coller la version brute **et activer l'option
> Literal** sur `APP_PASSWORD_HASH`. `password:hash` affiche les deux formes.

**6. Health check** — l'image fournit déjà un healthcheck sur `/health`. Il est
non authentifié et doit répondre `{"status":"ok"}`. Le healthcheck du Dockerfile
prend la priorité sur une éventuelle configuration saisie dans l'UI Coolify.

**7. Premier déploiement** — lancer _Deploy_, puis vérifier dans cet ordre : le
conteneur devient `Healthy`, les logs montrent la fin des migrations, `/health`
répond, `/login` s'affiche, puis une connexion et l'ajout d'un article
fonctionnent. Redéployer une seconde fois et vérifier que l'article existe
encore : c'est le test réel du volume SQLite.

**8. Notifications** — seulement après validation du staging, ajouter dans
_Scheduled Tasks_ la commande `node ace notify:expiring`, cron `0 9 * * *`.

Les migrations tournent au démarrage du conteneur, il n'y a pas d'étape
manuelle après un déploiement.

## Sauvegarde

Tout tient dans un fichier :

```bash
sqlite3 /app/storage/db.sqlite3 ".backup '/app/storage/backup.sqlite3'"
```
