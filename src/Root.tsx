import React from "react";
import { Composition } from "remotion";
import { PairingCard } from "./PairingCard";
import { DungBeetleNavigator } from "./DungBeetleNavigator";

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
        id="DungBeetleNavigator"
        component={DungBeetleNavigator}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
