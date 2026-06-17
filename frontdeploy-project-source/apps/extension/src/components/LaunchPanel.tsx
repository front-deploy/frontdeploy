import { WalletButton } from "./WalletButton";
import { FastLaunch } from "./FastLaunch";

export function LaunchPanel() {
  return (
    <div className="p-4 flex flex-col gap-2">
      <h2 className="text-lg font-medium text-axiom-text mb-2">Wallet & Fast Launch</h2>
      <WalletButton />
      <FastLaunch />
    </div>
  );
}
