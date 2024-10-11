import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "**/.DS_Store",
        "**/node_modules",
        "coverage",
        "dist",
        "ios",
        "android",
        "**/.env.local",
        "**/.env.*.local",
        "**/npm-debug.log*",
        "**/yarn-debug.log*",
        "**/yarn-error.log*",
        "**/pnpm-debug.log*",
        "**/.idea",
        "**/.vscode",
        "**/*.suo",
        "**/*.ntvs*",
        "**/*.njsproj",
        "**/*.sln",
        "**/*.sw?",
    ],
}, ...compat.extends(
    "plugin:vue/vue3-essential",
    "eslint:recommended",
    "@vue/typescript/recommended",
), {
    languageOptions: {
        globals: {
            ...globals.node,
        },

        ecmaVersion: 2020,
        sourceType: "commonjs",
    },

    rules: {
        "no-console": "off",
        "no-debugger": "off",
        "vue/no-deprecated-slot-attribute": "off",
        "@typescript-eslint/no-explicit-any": "off",
    },
}];