# Guide de Contribution - Golden Love 2026

## 🔄 Workflow Git et CI/CD

Ce projet utilise un workflow Git moderne avec intégration continue (CI) et déploiement continu (CD).

### 📋 Stratégie de Branches

- **`main`** : Branche de production, toujours stable et déployable
- **`develop`** : Branche de développement pour les nouvelles fonctionnalités
- **`feature/*`** : Branches pour les nouvelles fonctionnalités
- **`fix/*`** : Branches pour les corrections de bugs

### 🚀 Workflow de Développement

#### 1. Créer une nouvelle fonctionnalité

```bash
# Créer une branche depuis develop
git checkout develop
git pull origin develop
git checkout -b feature/nom-de-la-fonctionnalite

# Faire vos modifications...
git add .
git commit -m "feat: description de la fonctionnalité"
git push origin feature/nom-de-la-fonctionnalite
```

#### 2. Créer une Pull Request

1. Allez sur GitHub : https://github.com/harnoldmub/mariage-AR
2. Créez une Pull Request de votre branche vers `develop`
3. Attendez que les tests CI passent ✅
4. Demandez une revue de code si nécessaire
5. Mergez dans `develop`

#### 3. Déploiement en Production

```bash
# Une fois les fonctionnalités testées sur develop
git checkout main
git pull origin main
git merge develop
git push origin main

# Le workflow CD se déclenche automatiquement 🚀
```

### 🤖 CI/CD Automatique

#### Intégration Continue (CI)

Déclenché sur chaque push et Pull Request vers `main` ou `develop` :

✅ **Build et Tests** :
- Installation des dépendances
- Vérification TypeScript (`tsc --noEmit`)
- Build du projet
- Vérification des artifacts

✅ **Vérifications** :
- Analyse du code
- Formatage

✅ **Sécurité** :
- Audit npm pour les vulnérabilités
- Vérification des dépendances

#### Déploiement Continu (CD)

Déclenché automatiquement sur chaque push vers `main` :

🚀 **Processus de Déploiement** :
1. Récupération des informations de commit
2. Build de production
3. Vérification du build
4. Notification de déploiement
5. Replit déploie automatiquement les changements

### 📝 Convention de Commits

Nous utilisons la convention **Conventional Commits** :

```
<type>(<scope>): <description>

[corps optionnel]

[pied optionnel]
```

**Types de commits** :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation uniquement
- `style`: Formatage, virgules manquantes, etc.
- `refactor`: Refactorisation du code
- `perf`: Amélioration des performances
- `test`: Ajout ou modification de tests
- `chore`: Maintenance, dépendances, etc.

**Exemples** :
```bash
git commit -m "feat(rsvp): ajouter validation email dans le formulaire"
git commit -m "fix(admin): corriger l'affichage des numéros de table"
git commit -m "docs: mettre à jour le README avec les instructions de déploiement"
```

### 🔍 Vérifications Avant de Pusher

```bash
# Vérifier les types TypeScript
npx tsc --noEmit

# Builder le projet
npm run build

# Si tout est OK, pusher
git push
```

### 🛠️ Configuration Git dans Replit

1. Ouvrez le **Git Pane** dans Replit :
   - Cliquez sur **Tools** dans le menu
   - Cliquez sur **+** pour ajouter un outil
   - Sélectionnez **Git**

2. Connectez votre compte GitHub

3. Utilisez l'interface visuelle pour :
   - Voir les changements
   - Créer des commits
   - Pusher vers GitHub
   - Créer des branches

### 📊 Statut des Builds

Vérifiez l'état de vos builds sur GitHub :
- https://github.com/harnoldmub/mariage-AR/actions

Les badges de statut apparaîtront sur votre README.

### 🔐 Secrets et Variables d'Environnement

Les secrets sont gérés via Replit Secrets :
- `DATABASE_URL` : URL de la base de données
- `SESSION_SECRET` : Secret pour les sessions
- `RESEND_API_KEY` : Clé API Resend pour les emails

**Important** : Ne jamais commiter de secrets dans Git !

### 🐛 Résolution de Problèmes

#### Le workflow CI échoue
1. Consultez les logs sur GitHub Actions
2. Vérifiez localement : `npx tsc --noEmit`
3. Assurez-vous que le build fonctionne : `npm run build`

#### Conflit de merge
```bash
# Récupérer les derniers changements
git fetch origin

# Merger main dans votre branche
git merge origin/main

# Résoudre les conflits manuellement
# Puis :
git add .
git commit -m "fix: résolution des conflits"
git push
```

### 📞 Support

Pour toute question sur le workflow :
- Consultez la documentation dans `replit.md`
- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement
