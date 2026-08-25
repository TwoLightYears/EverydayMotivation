import React from "react";
import { Composition } from "remotion";
import { PairingCard } from "./PairingCard";
import { PeregrineFalconCard } from "./PeregrineFalconCard";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PairingCard"
        component={PairingCard}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="PeregrineFalcon"
        component={PeregrineFalconCard}
        durationInFrames={165}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
