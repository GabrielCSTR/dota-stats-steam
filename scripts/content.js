function getSteamID() {
  const abuseIDElement = document.querySelector('[name="abuseID"]');
  if (abuseIDElement) {
    return abuseIDElement.value;
  }

  const scriptContent = document.querySelector(
    ".responsive_page_template_content"
  )?.innerHTML;
  if (scriptContent) {
    const steamIDMatch = scriptContent.match(/"steamid":"(\d+)"/);
    return steamIDMatch?.[1] || null;
  }

  return null;
}

const steamID = getSteamID();
const steamID3 = BigInt(steamID) - BigInt("76561197960265728");

chrome.runtime.sendMessage({
  action: "fetchDotaStats",
  steamID: steamID3.toString()
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "updateDotaStats") {
    console.log("DATAAA", message.data);
    updateDotaStatsDOM(message.data);
  }
  if (message.action === "logData") {
    console.log("EVENT LOG", message.data);
  }
});

function updateDotaStatsDOM(data) {
  const medalImage = data.seasonLeaderboardRank
    ? ""
    : chrome.runtime.getURL(data.medalImage);
  const leaderboardMedalImage = data.seasonLeaderboardRank
    ? chrome.runtime.getURL(data.leaderboardMedalImage)
    : null;

  const customize =
    document.querySelector(".profile_customization_area") ||
    document.querySelector(".profile_leftcol");

  const winRate =
    data.matchCount > 0 ? (data.winCount / data.matchCount) * 100 : 0;

  let starImage =
    data.seasonRank !== "80" && !data.seasonLeaderboardRank && data.starImage
      ? chrome.runtime.getURL(data.starImage)
      : "";

  const playerName = data.proSteamAccount?.name || data.playerName;
  const isPro = data.isPro;
  const isAnonymous = data.isAnonymous;

  const proSVG = isPro
    ? `<div class="tooltip">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="height: 20px; width: 20px; fill: rgb(232, 91, 69);">
            <path d="M11.354,23.25L12.646,23.25C15.075,23.25 17.327,22.493 19.174,21.203C19.151,21.144 19.139,21.082 19.139,21.016C19.14,20.884 19.139,20.743 19.138,20.596C19.126,19.02 19.11,16.681 20.697,15.066C21.619,14.129 22.979,14.21 23.751,14.335L23.755,14.336C23.915,13.582 24,12.801 24,12C24,5.791 18.912,0.75 12.646,0.75L11.354,0.75C5.088,0.75 0,5.791 0,12C0,12.801 0.085,13.582 0.246,14.336L0.249,14.335C1.021,14.21 2.381,14.129 3.303,15.066C4.89,16.681 4.874,19.02 4.862,20.596C4.861,20.743 4.86,20.884 4.861,21.016C4.861,21.082 4.849,21.144 4.826,21.203C6.674,22.493 8.925,23.25 11.354,23.25ZM10.089,13.516L16.968,6.13C17.132,5.957 17.398,5.957 17.562,6.13L18.552,7.175C18.716,7.348 18.716,7.628 18.552,7.801L10.386,16.545C10.222,16.718 9.956,16.718 9.792,16.545L5.416,11.921C5.338,11.838 5.293,11.726 5.293,11.608C5.293,11.49 5.338,11.377 5.416,11.294L6.406,10.25C6.57,10.077 6.836,10.077 7,10.25L10.089,13.516Z"></path>
        </svg>
        <span class="tooltiptext">Professional</span>
    </div>`
    : "";

  const anonymousSVG = isAnonymous
    ? `<div class="tooltip">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="height: 20px; width: 20px; fill: rgba(255, 255, 255, 0.36);">
                        <path d="M12 24C5.373 24 0 18.627 0 12S5.373 0 12 0s12 5.373 12 12-5.373 12-12 12zm.017-16.5c-11.065 0-8.94 9-3.962 9 .998 0 1.937-.485 2.536-1.31l.643-.885a.96.96 0 0 1 1.566 0l.643.886a3.136 3.136 0 0 0 2.535 1.309c4.747 0 7.266-9-3.961-9zM8.6 13.227c-1.026 0-1.694-.601-2.002-.962a.408.408 0 0 1 0-.53c.308-.361.975-.962 2.002-.962 1.027 0 1.694.601 2.002.962.13.153.13.377 0 .53-.308.361-.976.962-2.002.962zm6.8 0c-1.027 0-1.694-.601-2.002-.962a.408.408 0 0 1 0-.53c.308-.361.975-.962 2.002-.962 1.027 0 1.694.601 2.002.962.13.153.13.377 0 .53-.308.361-.976.962-2.002.962z"/>
                        
                        </svg> <span class="tooltiptext">Anonymous</span>
                        </div>`
    : "";

  const textNode = document.createElement("div");
  textNode.id = "dotastats";
  textNode.innerHTML = `
  <div class="profile_customization">
    <div class="profile_customization_header">Dota 2 Stats <span class="editor">by <a href="https://www.twitch.tv/xstrdoto" class="whiteLink" target="_blank">xSTRDoto</a></span></div>
    <div class="profile_customization_block">
      <div class="favoritegroup_showcase">
        <div class="showcase_content_bg">
          <div class="dotastats_content favoritegroup_showcase_group showcase_slot">                  
            <div class="favoritegroup_content">
              <div class="dotastats_namerow favoritegroup_namerow ellipsis " >
                <a href="https://stratz.com/players/${steamID3}" class="favoritegroup_name whiteLink" target="_blank">
                  ${playerName} ${proSVG} ${anonymousSVG}
                </a>
                <br>
                <span class="dotastats_description favoritegroup_description">
                  ${data.isAnonymous ? "" : ""}
                </span>
                ${
                  starImage
                    ? `<img src="${starImage}" alt="Star Image" class="custom-star-image" style="left: 264px;">`
                    : ""
                }
                <br>
                <span class="dotastats_description favoritegroup_description leaderboard-rank">
                  ${
                    data.seasonLeaderboardRank
                      ? `${data.seasonLeaderboardRank}`
                      : ""
                  }
                </span>
              </div>
              <div class="dotastats_stats_block">
                <div class="dotastats_stats_row2 favoritegroup_stats showcase_stats_row">
                  ${
                    medalImage
                      ? `<div class="dotastats_stat showcase_stat favoritegroup_online">
                    <div class="value">
                      <img class="medal-image" src="${medalImage}" alt="Medal Image">
                    </div>
                  </div>`
                      : ""
                  }
                  ${
                    leaderboardMedalImage
                      ? `<div class="dotastats_stat showcase_stat favoritegroup_online">
                    <div class="value">
                      <img class="leaderboard-medal-image" src="${leaderboardMedalImage}" alt="Leaderboard Medal Image">
                    </div>
                  </div>`
                      : ""
                  }
                  <div class="dotastats_stat showcase_stat favoritegroup_online">
                    <div class="value" ;">${data.matchCount}</div>
                    <div class="label">Matches</div>
                  </div>
                  <div class="dotastats_stat showcase_stat favoritegroup_online">
                    <div class="value" style="color: ${
                      winRate < 50 ? "red" : "green"
                    };">${winRate.toFixed(2)}%</div>
                    <div class="label">Win Rate</div>
                  </div>
                  <div class="dotastats_stat showcase_stat favoritegroup_online">
                    <div class="value">
                      ${
                        data.firstMatchDate
                          ? new Date(data.firstMatchDate).toLocaleDateString()
                          : "N/A"
                      }
                    </div>
                    <div class="label">First Match Date</div>
                  </div>
                  <br>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  const existingNode = document.getElementById("dotastats");
  if (existingNode) {
    existingNode.innerHTML = textNode.innerHTML;
  } else {
    customize.prepend(textNode);
  }
}
