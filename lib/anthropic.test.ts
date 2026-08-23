import { describe, expect, it } from "vitest";
import { getAnthropicCaller, resetAnthropicCallerForTests } from "./anthropic";

describe("getAnthropicCaller — résolution de configuration", () => {
  it("renvoie null quand ANTHROPIC_API_KEY est absente, plutôt que de lever", () => {
    const avant = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    resetAnthropicCallerForTests();
    try {
      expect(getAnthropicCaller()).toBeNull();
    } finally {
      if (avant === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = avant;
      resetAnthropicCallerForTests();
    }
  });

  it("renvoie null pour une clé réduite à des espaces — un copier-coller vide n'est pas une clé", () => {
    const avant = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "   \n";
    resetAnthropicCallerForTests();
    try {
      expect(getAnthropicCaller()).toBeNull();
    } finally {
      if (avant === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = avant;
      resetAnthropicCallerForTests();
    }
  });

  it("renvoie un caller quand une clé est présente", () => {
    const avant = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    resetAnthropicCallerForTests();
    try {
      expect(getAnthropicCaller()).not.toBeNull();
    } finally {
      if (avant === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = avant;
      resetAnthropicCallerForTests();
    }
  });

  it("mémoïse le résultat entre deux appels sans réinitialisation", () => {
    const avant = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    resetAnthropicCallerForTests();
    try {
      expect(getAnthropicCaller()).toBe(getAnthropicCaller());
    } finally {
      if (avant === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = avant;
      resetAnthropicCallerForTests();
    }
  });
});
