# Brabita

Um diário pessoal de treino, feito para registrar o que aconteceu e acompanhar a própria história sem cobrança.

## Rodar localmente

```bash
npm install
npm run dev
```

## Verificar e gerar o site

```bash
npm run check
npm run build
```

O app é uma PWA local-first com conta obrigatória pelo Firebase Authentication. Os dados do diário ficam no navegador, separados pela conta conectada, e podem ser exportados em **Eu → Seus dados**.

Publicado em [brabita-6e0ea.web.app](https://brabita-6e0ea.web.app/).

## Deploy

O workflow da `main` publica no Firebase Hosting. O repositório precisa ter o secret `FIREBASE_SERVICE_ACCOUNT_BRABITA_6E0EA`, criado pela integração do Firebase Hosting com o GitHub. A configuração pública do app Web pode ficar no bundle; nunca adicione uma chave privada ou credencial de conta de serviço ao repositório.
