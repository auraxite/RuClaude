# Desktop (Qt 6 + C++)

Shared GUI and platform-specific firewall implementations for Windows and Linux.

From repository root:

```sh
cmake -S desktop -B desktop/build -DCMAKE_BUILD_TYPE=Release
cmake --build desktop/build --parallel
```

Windows: run `desktop/windows/Build.cmd` and then `dist/Install.cmd` as Administrator.
Linux: `sudo bash desktop/linux/Install.sh` builds and installs on the local machine.

**Caution:** new Qt firewall/service implementations have not been end-to-end tested. Verify firewall state and API reachability on both platforms before relying on the tool.
