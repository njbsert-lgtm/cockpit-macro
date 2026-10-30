import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // `server-only` lève hors de la condition « react-server » que pose Next : sous Vitest,
      // on charge sa version vide, comme le fait Next pour le code serveur.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    // Les agents travaillent dans des worktrees git sous `.claude/worktrees/` : des copies du
    // dépôt, qu'il ne faut ni tester ni linter depuis la racine.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
  },
});
