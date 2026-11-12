import React from "react";
import { Composition } from "remotion";
import { PairingCard } from "./PairingCard";
import { ScallopCard } from "./ScallopCard";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ScallopCard"
        component={ScallopCard}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="PairingCard"
        component={PairingCard}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
