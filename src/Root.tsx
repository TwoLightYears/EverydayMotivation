import React from "react";
import { Composition } from "remotion";
import { PairingCard } from "./PairingCard";

export const Root: React.FC = () => {
  return (
    <Composition
      id="PairingCard"
      component={PairingCard}
      durationInFrames={150}
      defaultProps={{}}
      fps={30}
      width={1080}
      height={1350}
    />
  );
};
