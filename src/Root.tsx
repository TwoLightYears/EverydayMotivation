import React from "react";
import { Composition } from "remotion";
import { BombardierBeetleCard } from "./BombardierBeetleCard";

export const Root: React.FC = () => {
  return (
    <Composition
      id="PairingCard"
      component={BombardierBeetleCard}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1350}
    />
  );
};
