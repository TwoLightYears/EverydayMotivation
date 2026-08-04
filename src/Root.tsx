import React from "react";
import { Composition } from "remotion";
import { PairingCard } from "./PairingCard";

export const Root: React.FC = () => {
  return (
    <Composition
      id="PairingCard"
      component={PairingCard}
      durationInFrames={210}
      fps={30}
      width={1080}
      height={1350}
    />
  );
};
