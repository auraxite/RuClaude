# Independent v1.0.0 releases

From repository root, after reviewing and committing these changes:

```bash
git add -A
git commit -m "Reorganize Qt desktop and configure independent releases"
git push origin main
```

To release all components at version 1.0.0 (four different release tags):

```bash
git tag browser/v1.0.0
git tag android/v1.0.0
git tag windows/v1.0.0
git tag linux/v1.0.0
git push origin browser/v1.0.0 android/v1.0.0 windows/v1.0.0 linux/v1.0.0
```

Each tag launches just one platform workflow. GitHub will create four releases, with separate version histories. A single tag `v1.0.0` **does not** trigger this workflow.

Before tagging, ensure no remote tags with these names already exist (`git ls-remote --tags origin`). Do not force-move published tags. Android is built as a debug-signed prerelease, and desktop archives are preliminary builds. Check GitHub Actions runs and platform runtime behavior before distributing.
