import React from "react";
import { PageShell } from "../components/PageShell";

export function AboutPage() {
  return (
    <PageShell
      title="About"
      fullBleed
      showBottomRail={false}
      showFooter={false}
      stageClassName="pageStage--about"
    >
      <div
        className="aboutBg"
        style={
          {
            "--about-bg-url": "url('/images/about/StephenWalker_Image.jpg')",
          } as React.CSSProperties
        }
      >
        <div className="aboutOverlay" aria-hidden="true" />

        <div className="aboutContent">
          <div className="aboutSheet">
            {/* HERO */}
            <section className="aboutSection">
              <h2>What is OrcaCast?</h2>
              <p>
                OrcaCast is a weekly forecast of where orca sightings are more likely to be{" "}
                <strong>reported</strong>. It shows{" "}
                <strong>relative likelihood within the selected week</strong> — not real-time
                locations.
              </p>

              <ul className="aboutPills" aria-label="Key notes">
                <li className="aboutPill">Weekly forecast</li>
                <li className="aboutPill">Relative within week</li>
                <li className="aboutPill">Not live tracking</li>
              </ul>
            </section>

            <div className="aboutDivider" />

            {/* HOW TO READ */}
            <section className="aboutSection">
              <h2>How to interpret the map</h2>
              <ul className="aboutBullets">
                <li>
                  Brighter hex cells mean higher relative likelihood of reported sightings compared
                  to other cells in the same week — not guaranteed presence.
                </li>
                <li>
                  Example: if Hex A is brighter than Hex B, OrcaCast expects more reports in A than
                  B, based on historical patterns.
                </li>
                <li>Observed points reflect reported sightings, not live locations.</li>
              </ul>

              <div className="aboutGridTable" role="group" aria-label="Grid sizes">
                <div className="aboutGridHead">Grid</div>
                <div className="aboutGridHead">Avg area</div>
                <div className="aboutGridHead">Best for</div>

                <div className="aboutGridCell">
                  <strong>H4</strong> (large)
                </div>
                <div className="aboutGridCell">~1,770 km² (≈684 mi²)</div>
                <div className="aboutGridCell">Broad regional patterns</div>

                <div className="aboutGridCell">
                  <strong>H5</strong> (medium)
                </div>
                <div className="aboutGridCell">~253 km² (≈98 mi²)</div>
                <div className="aboutGridCell">Sub-regional patterns</div>

                <div className="aboutGridCell">
                  <strong>H6</strong> (small)
                </div>
                <div className="aboutGridCell">~36 km² (≈14 mi²)</div>
                <div className="aboutGridCell">Local hotspots</div>
              </div>
            </section>

            <div className="aboutDivider" />

            {/* LIMITATIONS */}
            <section className="aboutSection">
              <h2>Limitations</h2>
              <p className="aboutSubtle">
                OrcaCast reflects reporting patterns and can be biased by observation conditions.
              </p>

              <details className="aboutDetails">
                <summary className="aboutSummary">Read limitations</summary>
                <ul className="aboutBullets aboutDetailsList">
                  <li>Observer effort can bias where sightings appear.</li>
                  <li>Weather, daylight, and access affect report coverage.</li>
                  <li>Forecasts are probabilistic and may miss rare events or sudden movement shifts.</li>
                </ul>
              </details>
            </section>

            <div className="aboutDivider" />

            {/* RESPONSIBLE USE */}
            <section className="aboutSection">
              <div className="aboutCallout" role="note" aria-label="Responsible use">
                <span className="material-symbols-rounded aboutCalloutIcon" aria-hidden="true">
                  warning
                </span>
                <div className="aboutCalloutText">
                  <strong>Responsible use:</strong> Follow local wildlife guidance and keep a
                  respectful distance. OrcaCast is for education and planning — not real-time
                  tracking, navigation, or enforcement.
                </div>
              </div>
            </section>
          </div>

          {/* Photo credit */}
          <div className="aboutPhotoCredit" role="contentinfo" aria-label="Background photo credit">
            <span className="material-symbols-rounded" aria-hidden="true">
              photo_camera
            </span>
            <span>
              Background photo: <strong>Stephen Walker</strong> (used with permission / attribution)
            </span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}