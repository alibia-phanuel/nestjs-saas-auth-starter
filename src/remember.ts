// REST                          GraphQL
// ─────────────────────         ─────────────────────
// GET  /users                   query { users { id email } }
// POST /auth/login              mutation { login(input: {...}) }
// PATCH /users/:id              mutation { updateUser(id, input) }

// Avantage GraphQL :
// → Le client choisit exactement les champs qu'il veut
// → Un seul endpoint /graphql
// → Pas de over-fetching (données inutiles)
// → Pas de under-fetching (plusieurs requêtes)