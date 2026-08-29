export default function Nav() {
  return (
    <>
      <div data-nav-status="close" data-nav-wrapper="" className="nav_wrapper">
        <div className="nav_banner">
          <div className="container-large">
            <div className="padding-global">
              <div className="nav_banner-link">
                <div className="text-size-small is-custom">
                  {"Behavioral waste detection and on-chain efficiency reputation for agent fleets."}
                </div>
                <div className="text-style-link is-top-banner">
                  {"View on GitHub"}
                </div>
              </div>
            </div>
          </div>
          <a href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="link_top w-inline-block" />
          <a href="#" className="nav_banner-close w-inline-block">
            <svg width="100%" fill="currentColor" viewBox="0 0 256 256" className="nav_banner-close-icon" xmlns="http://www.w3.org/2000/svg">
              <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208ZM165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32Z" />
            </svg>
          </a>
        </div>
        <header className="nav">
          <div className="padding-global">
            <div className="container-large">
              <div className="nav_inner">
                <a aria-label="Logo, click to go to home page." href="/" aria-current="page" className="nav_brand w-inline-block w--current">
                  <div aria-hidden="true" className="nav_logo hyperxdb-logo">
                    <span className="hyperxdb-logo_text">
                      {"Auto"}
                      <span className="hyperxdb-logo_x">p</span>
                      <span className="hyperxdb-logo_db">hagy</span>
                    </span>
                  </div>
                </a>
                <nav data-lenis-prevent="true" data-nav-menu="" className="nav_menu top-banner">
                  <div className="nav_menu-inner">
                    <ul className="nav_menu-ul is-bg">
                      <li className="nav_menu-li">
                        <a data-nav-link="" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="nav-link w-inline-block">
                          <span className="nav-link_span">
                            {"Pipeline"}
                          </span>
                          <div className="nav-line" />
                        </a>
                      </li>
                      <li className="nav_menu-li is-static">
                        <div data-delay="200" data-hover="true" data-nav-animate="" data-w-id="146b8d11-099f-df51-b324-794eb60a256f" className="navbar_menu-dropdown w-dropdown">
                          <div className="nav-link w-dropdown-toggle">
                            <div>
                              {"Registry"}
                            </div>
                            <div className="dropdown-chevron w-embed">
                              <svg width=" 100%" height=" 100%" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                {" "}
                                <path fillRule="evenodd" clipRule="evenodd" d="M2.55806 6.29544C2.46043 6.19781 2.46043 6.03952 2.55806 5.94189L3.44195 5.058C3.53958 4.96037 3.69787 4.96037 3.7955 5.058L8.00001 9.26251L12.2045 5.058C12.3021 4.96037 12.4604 4.96037 12.5581 5.058L13.4419 5.94189C13.5396 6.03952 13.5396 6.19781 13.4419 6.29544L8.17678 11.5606C8.07915 11.6582 7.92086 11.6582 7.82323 11.5606L2.55806 6.29544Z" fill="currentColor" />
                                {" "}
                              </svg>
                            </div>
                            <div className="nav-line" />
                          </div>
                          <nav className="navbar_dropdown-list w-dropdown-list">
                            <div className="filter_bg is-none" />
                            <div className="dropdown_list-wrapper">
                              <a data-wf--dropdown-link--variant="v1" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="navbar_dropdown-link w-inline-block">
                                <div className="nav_icon w-embed">
                                  <svg width="16" height="16" aria-hidden="true" role="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {" "}
                                    <path d="M13 2.5H3C2.73478 2.5 2.48043 2.60536 2.29289 2.79289C2.10536 2.98043 2 3.23478 2 3.5V7C2 10.295 3.595 12.2919 4.93313 13.3869C6.37437 14.5656 7.80813 14.9656 7.87063 14.9825C7.95656 15.0059 8.04719 15.0059 8.13313 14.9825C8.19563 14.9656 9.6275 14.5656 11.0706 13.3869C12.405 12.2919 14 10.295 14 7V3.5C14 3.23478 13.8946 2.98043 13.7071 2.79289C13.5196 2.60536 13.2652 2.5 13 2.5ZM13 7C13 9.31687 12.1462 11.1975 10.4625 12.5887C9.72955 13.1923 8.89597 13.662 8 13.9762C7.11576 13.6675 6.29247 13.2061 5.5675 12.6131C3.86375 11.2194 3 9.33125 3 7V3.5H13V7ZM5.14625 8.85375C5.05243 8.75993 4.99972 8.63268 4.99972 8.5C4.99972 8.36732 5.05243 8.24007 5.14625 8.14625C5.24007 8.05243 5.36732 7.99972 5.5 7.99972C5.63268 7.99972 5.75993 8.05243 5.85375 8.14625L7 9.29313L10.1462 6.14625C10.1927 6.09979 10.2479 6.06294 10.3086 6.0378C10.3692 6.01266 10.4343 5.99972 10.5 5.99972C10.5657 5.99972 10.6308 6.01266 10.6914 6.0378C10.7521 6.06294 10.8073 6.09979 10.8538 6.14625C10.9002 6.1927 10.9371 6.24786 10.9622 6.30855C10.9873 6.36925 11.0003 6.4343 11.0003 6.5C11.0003 6.5657 10.9873 6.63075 10.9622 6.69145C10.9371 6.75214 10.9002 6.8073 10.8538 6.85375L7.35375 10.3538C7.30731 10.4002 7.25217 10.4371 7.19147 10.4623C7.13077 10.4874 7.06571 10.5004 7 10.5004C6.93429 10.5004 6.86923 10.4874 6.80853 10.4623C6.74783 10.4371 6.69269 10.4002 6.64625 10.3538L5.14625 8.85375Z" fill="#FFBE0B" />
                                    {" "}
                                  </svg>
                                  {" "}
                                </div>
                                <div className="caption">
                                  {"Eyebrow"}
                                </div>
                                <div className="content_group">
                                  <div className="text-size-medium text-weight-medium text-color-primary">
                                    {"Watcher"}
                                  </div>
                                  <div className="text-size-small text-color-tertiary">
                                    {"Polls the live Kubernetes API and metrics-server — requested versus actual usage, plus each agent's own activity log."}
                                  </div>
                                </div>
                                <div className="border">
                                  <div className="plus_icon w-embed">
                                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      {" "}
                                      <path d="M1.71875 5.5H9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                      <path d="M5.5 1.71875V9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                    </svg>
                                  </div>
                                  <div className="border_progress" />
                                </div>
                                <div className="dropdown_bg" />
                              </a>
                              <a data-wf--dropdown-link--variant="v1" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="navbar_dropdown-link w-inline-block">
                                <div className="nav_icon w-embed">
                                  <svg width="16" height="16" aria-hidden="true" role="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {" "}
                                    <path d="M4.31985 5.88439L1.7811 8.00002L4.31985 10.1156C4.37175 10.1572 4.41485 10.2087 4.44661 10.2671C4.47838 10.3255 4.49818 10.3896 4.50485 10.4558C4.51153 10.5219 4.50494 10.5888 4.48548 10.6523C4.46602 10.7159 4.43407 10.775 4.39151 10.826C4.34895 10.8771 4.29664 10.9192 4.23762 10.9498C4.1786 10.9804 4.11407 10.999 4.0478 11.0043C3.98154 11.0097 3.91486 11.0018 3.85168 10.9811C3.7885 10.9604 3.73009 10.9273 3.67985 10.8838L0.67985 8.38377C0.623558 8.33684 0.578269 8.27812 0.547189 8.21175C0.51611 8.14538 0.5 8.07299 0.5 7.9997C0.5 7.92642 0.51611 7.85403 0.547189 7.78766C0.578269 7.72129 0.623558 7.66257 0.67985 7.61564L3.67985 5.11564C3.78179 5.03077 3.91327 4.98988 4.04537 5.00195C4.17747 5.01402 4.29936 5.07807 4.38422 5.18002C4.46909 5.28196 4.50999 5.41344 4.49792 5.54554C4.48585 5.67763 4.42179 5.79952 4.31985 5.88439ZM15.3198 7.61564L12.3198 5.11564C12.2694 5.07362 12.2111 5.04195 12.1484 5.02244C12.0857 5.00293 12.0197 4.99597 11.9543 5.00195C11.8889 5.00793 11.8253 5.02673 11.7672 5.05728C11.7091 5.08783 11.6575 5.12954 11.6155 5.18002C11.5306 5.28196 11.4897 5.41344 11.5018 5.54554C11.5139 5.67763 11.5779 5.79952 11.6798 5.88439L14.2186 8.00002L11.6798 10.1156C11.6279 10.1572 11.5849 10.2087 11.5531 10.2671C11.5213 10.3255 11.5015 10.3896 11.4948 10.4558C11.4882 10.5219 11.4948 10.5888 11.5142 10.6523C11.5337 10.7159 11.5656 10.775 11.6082 10.826C11.6507 10.8771 11.7031 10.9192 11.7621 10.9498C11.8211 10.9804 11.8856 10.999 11.9519 11.0043C12.0182 11.0097 12.0848 11.0018 12.148 10.9811C12.2112 10.9604 12.2696 10.9273 12.3198 10.8838L15.3198 8.38377C15.3761 8.33684 15.4214 8.27812 15.4525 8.21175C15.4836 8.14538 15.4997 8.07299 15.4997 7.9997C15.4997 7.92642 15.4836 7.85403 15.4525 7.78766C15.4214 7.72129 15.3761 7.66257 15.3198 7.61564ZM10.1705 2.03002C10.1088 2.00761 10.0432 1.99758 9.97762 2.00049C9.91203 2.00341 9.84764 2.01922 9.78816 2.04702C9.72867 2.07482 9.67524 2.11407 9.63092 2.16252C9.5866 2.21096 9.55225 2.26767 9.52985 2.32939L5.52985 13.3294C5.50735 13.3911 5.49724 13.4567 5.50011 13.5224C5.50298 13.5881 5.51877 13.6525 5.54657 13.7121C5.57438 13.7717 5.61366 13.8251 5.66216 13.8695C5.71066 13.9139 5.76743 13.9482 5.82922 13.9706C5.884 13.9901 5.94171 14 5.99985 14C6.10253 14 6.20272 13.9684 6.28681 13.9095C6.3709 13.8505 6.43481 13.7672 6.46985 13.6706L10.4698 2.67064C10.4923 2.60892 10.5023 2.54339 10.4994 2.47779C10.4965 2.41219 10.4806 2.34781 10.4528 2.28832C10.425 2.22884 10.3858 2.17541 10.3374 2.13109C10.2889 2.08677 10.2322 2.05242 10.1705 2.03002Z" fill="#FF704C" />
                                    {" "}
                                  </svg>
                                  {" "}
                                </div>
                                <div className="caption">
                                  {"Eyebrow"}
                                </div>
                                <div className="content_group">
                                  <div className="text-size-medium text-weight-medium text-color-primary">
                                    {"Diagnostician"}
                                  </div>
                                  <div className="text-size-small text-color-tertiary">
                                    {"Decides whether a measured pattern is genuine waste or a legitimate allocation, and says why in plain language."}
                                  </div>
                                </div>
                                <div className="border">
                                  <div className="plus_icon w-embed">
                                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      {" "}
                                      <path d="M1.71875 5.5H9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                      <path d="M5.5 1.71875V9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                    </svg>
                                  </div>
                                  <div className="border_progress" />
                                </div>
                                <div className="dropdown_bg" />
                              </a>
                              <a data-wf--dropdown-link--variant="v1" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="navbar_dropdown-link w-inline-block">
                                <div className="nav_icon w-embed">
                                  <svg width="16" height="16" aria-hidden="true" role="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {" "}
                                    <path d="M14 2.5V5C14 5.13261 13.9473 5.25979 13.8536 5.35355C13.7598 5.44732 13.6326 5.5 13.5 5.5C13.3674 5.5 13.2402 5.44732 13.1464 5.35355C13.0527 5.25979 13 5.13261 13 5V3H11C10.8674 3 10.7402 2.94732 10.6464 2.85355C10.5527 2.75979 10.5 2.63261 10.5 2.5C10.5 2.36739 10.5527 2.24021 10.6464 2.14645C10.7402 2.05268 10.8674 2 11 2H13.5C13.6326 2 13.7598 2.05268 13.8536 2.14645C13.9473 2.24021 14 2.36739 14 2.5ZM5 13H3V11C3 10.8674 2.94732 10.7402 2.85355 10.6464C2.75979 10.5527 2.63261 10.5 2.5 10.5C2.36739 10.5 2.24021 10.5527 2.14645 10.6464C2.05268 10.7402 2 10.8674 2 11V13.5C2 13.6326 2.05268 13.7598 2.14645 13.8536C2.24021 13.9473 2.36739 14 2.5 14H5C5.13261 14 5.25979 13.9473 5.35355 13.8536C5.44732 13.7598 5.5 13.6326 5.5 13.5C5.5 13.3674 5.44732 13.2402 5.35355 13.1464C5.25979 13.0527 5.13261 13 5 13ZM13.5 10.5C13.3674 10.5 13.2402 10.5527 13.1464 10.6464C13.0527 10.7402 13 10.8674 13 11V13H11C10.8674 13 10.7402 13.0527 10.6464 13.1464C10.5527 13.2402 10.5 13.3674 10.5 13.5C10.5 13.6326 10.5527 13.7598 10.6464 13.8536C10.7402 13.9473 10.8674 14 11 14H13.5C13.6326 14 13.7598 13.9473 13.8536 13.8536C13.9473 13.7598 14 13.6326 14 13.5V11C14 10.8674 13.9473 10.7402 13.8536 10.6464C13.7598 10.5527 13.6326 10.5 13.5 10.5ZM2.5 5.5C2.63261 5.5 2.75979 5.44732 2.85355 5.35355C2.94732 5.25979 3 5.13261 3 5V3H5C5.13261 3 5.25979 2.94732 5.35355 2.85355C5.44732 2.75979 5.5 2.63261 5.5 2.5C5.5 2.36739 5.44732 2.24021 5.35355 2.14645C5.25979 2.05268 5.13261 2 5 2H2.5C2.36739 2 2.24021 2.05268 2.14645 2.14645C2.05268 2.24021 2 2.36739 2 2.5V5C2 5.13261 2.05268 5.25979 2.14645 5.35355C2.24021 5.44732 2.36739 5.5 2.5 5.5ZM5 4.5H11C11.1326 4.5 11.2598 4.55268 11.3536 4.64645C11.4473 4.74021 11.5 4.86739 11.5 5V11C11.5 11.1326 11.4473 11.2598 11.3536 11.3536C11.2598 11.4473 11.1326 11.5 11 11.5H5C4.86739 11.5 4.74021 11.4473 4.64645 11.3536C4.55268 11.2598 4.5 11.1326 4.5 11V5C4.5 4.86739 4.55268 4.74021 4.64645 4.64645C4.74021 4.55268 4.86739 4.5 5 4.5ZM5.5 10.5H10.5V5.5H5.5V10.5Z" fill="#FF704C" />
                                    {" "}
                                  </svg>
                                  {" "}
                                </div>
                                <div className="caption">
                                  {"Eyebrow"}
                                </div>
                                <div className="content_group">
                                  <div className="text-size-medium text-weight-medium text-color-primary">
                                    {"Negotiator"}
                                  </div>
                                  <div className="text-size-small text-color-tertiary">
                                    {"Prices the waste against published cloud rates and proposes one specific corrective action."}
                                  </div>
                                </div>
                                <div className="border">
                                  <div className="plus_icon w-embed">
                                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      {" "}
                                      <path d="M1.71875 5.5H9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                      <path d="M5.5 1.71875V9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                    </svg>
                                  </div>
                                  <div className="border_progress" />
                                </div>
                                <div className="dropdown_bg" />
                              </a>
                              <a data-wf--dropdown-link--variant="v1" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="navbar_dropdown-link w-inline-block">
                                <div className="nav_icon w-embed">
                                  <svg width="16" height="16" aria-hidden="true" role="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {" "}
                                    <path d="M15.0001 5.51435C14.975 6.38476 14.6171 7.21241 14.0001 7.82685L11.8282 9.99997C11.5119 10.318 11.1357 10.5702 10.7212 10.7418C10.3068 10.9135 9.86243 11.0012 9.41386 11H9.41074C8.95451 10.9997 8.50297 10.9079 8.0828 10.7301C7.66263 10.5524 7.28234 10.2922 6.9644 9.96501C6.64647 9.63781 6.39733 9.25021 6.23171 8.82511C6.06608 8.40001 5.98733 7.94602 6.00011 7.48997C6.00384 7.35736 6.0601 7.23167 6.1565 7.14054C6.25291 7.04941 6.38157 7.00031 6.51417 7.00404C6.64678 7.00777 6.77248 7.06402 6.86361 7.16043C6.95474 7.25683 7.00384 7.38549 7.00011 7.5181C6.99101 7.84055 7.04663 8.16156 7.16369 8.46215C7.28076 8.76275 7.45688 9.03682 7.68167 9.26819C7.90645 9.49956 8.17533 9.68353 8.47242 9.80921C8.76951 9.9349 9.08878 9.99977 9.41136 9.99997C9.72847 10.0008 10.0426 9.93873 10.3356 9.8174C10.6285 9.69607 10.8946 9.51787 11.1182 9.2931L13.2901 7.12122C13.7382 6.66748 13.9886 6.05488 13.9866 5.41716C13.9846 4.77945 13.7304 4.16843 13.2795 3.7175C12.8285 3.26657 12.2175 3.01235 11.5798 3.01036C10.9421 3.00836 10.3295 3.25875 9.87574 3.70685L9.18824 4.39435C9.09371 4.48416 8.96783 4.53349 8.83745 4.53182C8.70707 4.53015 8.5825 4.47761 8.4903 4.38541C8.3981 4.29321 8.34556 4.16864 8.34389 4.03826C8.34222 3.90788 8.39155 3.782 8.48136 3.68747L9.16886 2.99997C9.48605 2.68268 9.86263 2.43098 10.2771 2.25926C10.6916 2.08753 11.1358 1.99915 11.5845 1.99915C12.0331 1.99915 12.4774 2.08753 12.8919 2.25926C13.3063 2.43098 13.6829 2.68268 14.0001 2.99997C14.3286 3.32932 14.5867 3.72208 14.7586 4.15434C14.9306 4.5866 15.0127 5.04933 15.0001 5.51435ZM6.81261 11.6037L6.12511 12.2912C5.90088 12.517 5.63401 12.6959 5.34002 12.8175C5.04603 12.9392 4.73078 13.0012 4.41261 13C3.9353 12.9996 3.46881 12.8577 3.07209 12.5923C2.67537 12.3269 2.36621 11.9499 2.18368 11.5089C2.00116 11.0678 1.95345 10.5826 2.04659 10.1145C2.13974 9.64633 2.36955 9.2163 2.70699 8.87872L4.87511 6.70685C5.2166 6.36355 5.65343 6.13087 6.12886 6.03903C6.60428 5.94718 7.09634 6.00041 7.54113 6.1918C7.98592 6.3832 8.36288 6.70391 8.62306 7.11229C8.88324 7.52067 9.01461 7.99785 9.00011 8.48185C8.99638 8.61446 9.04548 8.74311 9.13661 8.83952C9.22775 8.93593 9.35344 8.99218 9.48605 8.99591C9.61866 8.99964 9.74732 8.95054 9.84372 8.85941C9.94013 8.76828 9.99638 8.64258 10.0001 8.50997C10.0121 8.04568 9.92967 7.58379 9.75777 7.15232C9.58587 6.72085 9.3281 6.32881 9.00011 5.99997C8.3596 5.35974 7.49105 5.00008 6.58542 5.00008C5.6798 5.00008 4.81125 5.35974 4.17074 5.99997L2.00011 8.17185C1.52276 8.64901 1.19756 9.25697 1.06562 9.91889C0.933678 10.5808 1.00091 11.267 1.25883 11.8907C1.51675 12.5144 1.95377 13.0477 2.51467 13.4231C3.07557 13.7986 3.73517 13.9993 4.41011 14C4.85878 14.0013 5.30325 13.9136 5.71779 13.7419C6.13233 13.5702 6.5087 13.3181 6.82511 13L7.51261 12.3125C7.59353 12.2172 7.6358 12.095 7.6311 11.9701C7.62639 11.8451 7.57505 11.7265 7.48719 11.6375C7.39934 11.5486 7.28134 11.4958 7.15647 11.4895C7.0316 11.4832 6.90892 11.524 6.81261 11.6037Z" fill="#FF704C" />
                                    {" "}
                                  </svg>
                                  {" "}
                                </div>
                                <div className="caption">
                                  {"Eyebrow"}
                                </div>
                                <div className="content_group">
                                  <div className="text-size-medium text-weight-medium text-color-primary">
                                    {"Approval Gate"}
                                  </div>
                                  <div className="text-size-small text-color-tertiary">
                                    {"Nothing executes automatically — a human approves the cluster action and the attestation together."}
                                  </div>
                                </div>
                                <div className="border">
                                  <div className="plus_icon w-embed">
                                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      {" "}
                                      <path d="M1.71875 5.5H9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                      <path d="M5.5 1.71875V9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                    </svg>
                                  </div>
                                  <div className="border_progress" />
                                </div>
                                <div className="dropdown_bg" />
                              </a>
                              <a data-wf--dropdown-link--variant="v1" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="navbar_dropdown-link w-inline-block">
                                <div className="nav_icon w-embed">
                                  <svg width="16" height="16" aria-hidden="true" role="img" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {" "}
                                    <path d="M13.98 4.13439L8.48 1.12501C8.33305 1.04381 8.16789 1.00122 8 1.00122C7.83211 1.00122 7.66695 1.04381 7.52 1.12501L2.02 4.13564C1.86293 4.22158 1.73181 4.34811 1.64034 4.50203C1.54888 4.65594 1.50041 4.83159 1.5 5.01064V10.9881C1.50041 11.1672 1.54888 11.3428 1.64034 11.4967C1.73181 11.6507 1.86293 11.7772 2.02 11.8631L7.52 14.8738C7.66695 14.955 7.83211 14.9976 8 14.9976C8.16789 14.9976 8.33305 14.955 8.48 14.8738L13.98 11.8631C14.1371 11.7772 14.2682 11.6507 14.3597 11.4967C14.4511 11.3428 14.4996 11.1672 14.5 10.9881V5.01126C14.4999 4.8319 14.4516 4.65586 14.3601 4.50158C14.2686 4.34731 14.1373 4.22048 13.98 4.13439ZM8 2.00001L13.0212 4.75001L8 7.50001L2.97875 4.75001L8 2.00001ZM2.5 5.62501L7.5 8.36126V13.7231L2.5 10.9888V5.62501ZM8.5 13.7231V8.36376L13.5 5.62501V10.9863L8.5 13.7231Z" fill="#00D69F" />
                                    {" "}
                                  </svg>
                                  {" "}
                                </div>
                                <div className="caption">
                                  {"Eyebrow"}
                                </div>
                                <div className="content_group">
                                  <div className="text-size-medium text-weight-medium text-color-primary">
                                    {"Efficiency Registry"}
                                  </div>
                                  <div className="text-size-small text-color-tertiary">
                                    {"Confirmed incidents are attested on Base Sepolia, queryable by anyone without trusting our dashboard."}
                                  </div>
                                </div>
                                <div className="border">
                                  <div className="plus_icon w-embed">
                                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      {" "}
                                      <path d="M1.71875 5.5H9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                      <path d="M5.5 1.71875V9.28125" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                      {" "}
                                    </svg>
                                  </div>
                                  <div className="border_progress" />
                                </div>
                                <div className="dropdown_bg" />
                              </a>
                            </div>
                          </nav>
                        </div>
                      </li>
                      <li className="nav_menu-li hide">
                        <a data-nav-link="" href="#" className="nav-link w-inline-block">
                          <span className="nav-link_span">
                            {"Incidents"}
                          </span>
                          <div className="nav-line" />
                        </a>
                      </li>
                      <li className="nav_menu-li">
                        <a data-nav-link="" href="https://github.com/sylesh7/Autophagy/blob/main/backend/README.md#detection-rules" target="_blank" rel="noopener noreferrer" className="nav-link w-inline-block">
                          <span className="nav-link_span">
                            {"Incidents"}
                          </span>
                          <div className="nav-line" />
                        </a>
                      </li>
                      <li className="nav_menu-li">
                        <a data-nav-link="" href="https://github.com/sylesh7/Autophagy#readme" target="_blank" rel="noopener noreferrer" className="nav-link w-inline-block">
                          <span className="nav-link_span">
                            {"Docs"}
                          </span>
                          <div className="nav-line" />
                        </a>
                      </li>
                      <li className="nav_menu-li">
                        <a data-nav-link="" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="nav-link w-inline-block">
                          <span className="nav-link_span">
                            {"GitHub"}
                          </span>
                          <div className="nav-line" />
                        </a>
                      </li>
                      <li className="nav_menu-li">
                        <a data-nav-link="" href="/memory/ask" className="nav-link w-inline-block">
                          <span className="nav-link_span">
                            {"Dashboard"}
                          </span>
                          <div className="nav-line" />
                        </a>
                      </li>
                    </ul>
                    <div data-nav-link="" className="nav_menu-bottom">
                      <a data-button-066="" data-wf--button--variant="secondary" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="button-066 w-variant-7aacb254-d629-e60c-a24a-583d01bf7e54 w-inline-block">
                        <span className="button-066__bg w-variant-7aacb254-d629-e60c-a24a-583d01bf7e54" />
                        <span className="button-066__inner">
                          <span data-button-066-text="" className="button-066__text">
                            {"GitHub"}
                          </span>
                        </span>
                      </a>
                      <a data-button-066="" data-wf--button--variant="primary" href="/memory/ask" className="button-066 w-inline-block">
                        <span className="button-066__bg" />
                        <span className="button-066__inner">
                          <span data-button-066-text="" className="button-066__text">
                            {"Open Dashboard"}
                          </span>
                        </span>
                      </a>
                    </div>
                  </div>
                </nav>
                <div className="nav_button-wrapper">
                  <a data-nav-link="" href="https://github.com/sylesh7/Autophagy" target="_blank" rel="noopener noreferrer" className="nav-link w-inline-block">
                    <span className="nav-link_span">
                      {"GitHub"}
                      <div className="nav-line" />
                    </span>
                  </a>
                  <a data-button-066="" data-wf--button--variant="primary" href="/memory/ask" className="button-066 w-inline-block">
                    <span className="button-066__bg" />
                    <span className="button-066__inner">
                      <span data-button-066-text="" className="button-066__text">
                        {"Open Dashboard"}
                      </span>
                    </span>
                  </a>
                </div>
                <button aria-label="Menu button, click to open menu" data-nav-button="toggle" className="nav_button">
                  <div className="nav_button_wrap">
                    <div className="nav_button_line" />
                    <div className="nav_button_embed w-embed" />
                    <div className="nav_button_line is-opacity" />
                    <div className="nav_button_line" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>
        <div fs-cc-scroll="disable" fs-cc="preferences" className="fs-cc-prefs2_component">
          <div className="fs-cc-prefs2_form-wrapper-2 w-form">
            <form id="cookie-preferences" name="wf-form-Cookie-Preferences" data-name="Cookie Preferences" method="get" className="fs-cc-prefs2_form-2" data-wf-page-id="6a3e64ff64a92f2281e8e826" data-wf-element-id="e204c841-6842-9a4f-10fe-1bb90f9b8a73">
              <div fs-cc="close" className="fs-cc-prefs2_close">
                <div className="fs-cc-preferences2_close-icon w-embed">
                  <svg fill="currentColor" aria-hidden="true" focusable="false" viewBox="0 0 16 16">
                    {" "}
                    <path d="M9.414 8l4.293-4.293-1.414-1.414L8 6.586 3.707 2.293 2.293 3.707 6.586 8l-4.293 4.293 1.414 1.414L8 9.414l4.293 4.293 1.414-1.414L9.414 8z" />
                    {" "}
                  </svg>
                </div>
              </div>
              <div className="fs-cc-prefs2_content">
                <div className="fs-cc-prefs2_space-small">
                  <div className="fs-cc-prefs2_title">
                    {"Privacy Preferences"}
                  </div>
                </div>
                <div className="fs-cc-prefs2_option">
                  <div className="fs-cc-prefs2_toggle-wrapper">
                    <div className="fs-cc-prefs2_label">
                      {"Essential cookies"}
                    </div>
                    <div>
                      {"Required"}
                    </div>
                  </div>
                </div>
                <div className="fs-cc-prefs2_option">
                  <div className="fs-cc-prefs2_toggle-wrapper">
                    <div className="fs-cc-prefs2_label">
                      {"Marketing cookies"}
                    </div>
                    <label className="w-checkbox fs-cc-prefs2_checkbox-field">
                      <div className="w-checkbox-input w-checkbox-input--inputType-custom fs-cc-prefs2_checkbox" />
                      <input type="checkbox" name="marketing-2" id="marketing-2" data-name="Marketing 2" fs-cc-checkbox="marketing" style={{"opacity": "0", "position": "absolute", "zIndex": "-1"}} />
                      <span for="marketing-2" className="fs-cc-prefs2_checkbox-label w-form-label">
                        {"Essential"}
                      </span>
                    </label>
                  </div>
                </div>
                <div className="fs-cc-prefs2_option">
                  <div className="fs-cc-prefs2_toggle-wrapper">
                    <div className="fs-cc-prefs2_label">
                      {"Personalization cookies"}
                    </div>
                    <label className="w-checkbox fs-cc-prefs2_checkbox-field">
                      <div className="w-checkbox-input w-checkbox-input--inputType-custom fs-cc-prefs2_checkbox" />
                      <input type="checkbox" name="personalization-2" id="personalization-2" data-name="Personalization 2" fs-cc-checkbox="personalization" style={{"opacity": "0", "position": "absolute", "zIndex": "-1"}} />
                      <span for="personalization-2" className="fs-cc-prefs2_checkbox-label w-form-label">
                        {"Essential"}
                      </span>
                    </label>
                  </div>
                </div>
                <div className="fs-cc-prefs2_option">
                  <div className="fs-cc-prefs2_toggle-wrapper">
                    <div className="fs-cc-prefs2_label">
                      {"Analytics cookies"}
                    </div>
                    <label className="w-checkbox fs-cc-prefs2_checkbox-field">
                      <div className="w-checkbox-input w-checkbox-input--inputType-custom fs-cc-prefs2_checkbox" />
                      <input type="checkbox" name="analytics-2" id="analytics-2" data-name="Analytics 2" fs-cc-checkbox="analytics" style={{"opacity": "0", "position": "absolute", "zIndex": "-1"}} />
                      <span for="analytics-2" className="fs-cc-prefs2_checkbox-label w-form-label">
                        {"Essential"}
                      </span>
                    </label>
                  </div>
                </div>
                <div className="fs-cc-prefs2_buttons-wrapper">
                  <a fs-cc="deny" href="#" className="fs-cc-prefs2_button fs-cc-button-alt w-button">
                    {"Reject all cookies"}
                  </a>
                  <a fs-cc="allow" href="#" className="fs-cc-prefs2_button w-button">
                    {"Allow all cookies"}
                  </a>
                  <a fs-cc="submit" href="#" className="fs-cc-prefs2_submit w-button">
                    {"Save preferences"}
                  </a>
                </div>
              </div>
            </form>
            <div className="w-form-done" />
            <div className="w-form-fail" />
            <div fs-cc="close" className="fs-cc-prefs2_overlay" />
          </div>
        </div>
      </div>
    </>
  );
}
