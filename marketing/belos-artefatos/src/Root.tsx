import { Composition, Folder } from "remotion";
import { BelosPave, T } from "./Video";
import { Hook } from "./Hook";
import { BeforeAfter } from "./BeforeAfter";
import { Showcase } from "./Showcase";
import { Colors } from "./Colors";
import { Cta } from "./Cta";
import { BelosCobogos, TC } from "./VideoCobogos";
import { CoboHook } from "./CoboHook";
import { CoboMontage } from "./CoboMontage";
import { CoboXl } from "./CoboXl";
import { CoboLadder } from "./CoboLadder";

const size = { fps: 30, width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BelosPave"
        component={BelosPave}
        durationInFrames={T.end}
        {...size}
      />
      <Composition
        id="BelosCobogos"
        component={BelosCobogos}
        durationInFrames={TC.end}
        {...size}
      />
      <Folder name="Cenas-Cobogos">
        <Composition
          id="CoboAbertura"
          component={CoboHook}
          durationInFrames={TC.mont - TC.hook}
          {...size}
        />
        <Composition
          id="CoboDesenhos"
          component={CoboMontage}
          durationInFrames={TC.xl - TC.mont}
          {...size}
        />
        <Composition
          id="CoboPaineis"
          component={CoboXl}
          durationInFrames={TC.ladder - TC.xl}
          {...size}
        />
        <Composition
          id="CoboTamanhos"
          component={CoboLadder}
          durationInFrames={TC.cta - TC.ladder}
          {...size}
        />
      </Folder>
      <Folder name="Cenas">
        <Composition
          id="Abertura"
          component={Hook}
          durationInFrames={T.ad - T.hook}
          {...size}
        />
        <Composition
          id="AntesDepois"
          component={BeforeAfter}
          durationInFrames={T.show - T.ad}
          {...size}
        />
        <Composition
          id="Modelos"
          component={Showcase}
          durationInFrames={T.colors - T.show}
          {...size}
        />
        <Composition
          id="Cores"
          component={Colors}
          durationInFrames={T.cta - T.colors}
          {...size}
        />
        <Composition
          id="Contacto"
          component={Cta}
          durationInFrames={T.end - T.cta}
          {...size}
        />
      </Folder>
    </>
  );
};
