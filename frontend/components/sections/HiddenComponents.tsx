export default function HiddenComponents() {
  return (
    <>
      <div className="hide">
        <section className="section">
          <div className="padding-global">
            <div className="container-large">
              <div aria-hidden="true" data-wf--vertical-spacer--size-variant="xlarge" className="vertical-spacer" />
              <div className="section_slot">
                <h1 className="heading_component heading-style-h1">
                  <span text-animate="words" className="heading_text">
                    {"Heading Component"}
                  </span>
                </h1>
              </div>
              <div aria-hidden="true" data-wf--vertical-spacer--size-variant="xlarge" className="vertical-spacer" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
