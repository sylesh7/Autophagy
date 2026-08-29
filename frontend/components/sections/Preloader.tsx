export default function Preloader() {
  return (
    <>
      <div id="preloader" className="preloader">
        <img src="/assets/6a45168c7316606c592707d9_grid.svg" loading="lazy" alt="" className="preloader__grid" />
        <div className="preloader__inner">
          <div className="preloader__num">
            <div id="plNum" className="plnum" />
            <div>
              {"%"}
            </div>
          </div>
          <div className="preloader__bar">
            <div id="plBar" className="plbar" />
          </div>
        </div>
      </div>
    </>
  );
}
