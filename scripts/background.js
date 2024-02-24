chrome.runtime.onInstalled.addListener(() => {
  fetch(chrome.runtime.getURL("config.json"))
    .then((response) => response.json())
    .then((data) => {
      chrome.storage.local.set({ config: data });
    });
});

let bearerToken = "";
let stratzApi = "";
chrome.storage.local.get("config", (data) => {
  bearerToken = data.config.STRATZ_TOKEN;
  stratzApi = data.config.STRATZ_GQL;
});

function makeGraphQLRequest(steamID3) {
  const query = `
  query playerInfo ($steamid: Long!)
  {
    player(steamAccountId: $steamid) {
      firstMatchDate
      matchCount 
      winCount 
      MatchGroupBySteamId: matchesGroupBy( request: {
        take: 5
        gameModeIds: [1,22]
        playerList: SINGLE
        groupBy: STEAM_ACCOUNT_ID
      }) {
        ... on MatchGroupBySteamAccountIdType{ matchCount winCount avgImp avgKills avgDeaths avgAssists avgExperiencePerMinute avgGoldPerMinute avgKDA }
      }
      MatchGroupByHero: matchesGroupBy( request: {
        take: 5
        gameModeIds: [1,22]
        playerList: SINGLE
        groupBy: HERO
      }) {
        ... on MatchGroupByHeroType{ heroId matchCount winCount avgKills avgDeaths avgAssists avgExperiencePerMinute avgGoldPerMinute avgKDA avgImp }
      }
      simpleSummary{
        matchCount
        lastUpdateDateTime
        heroes
        {
          heroId
          winCount
          lossCount
        }
      }
      steamAccount {
        name 
        avatar
        isAnonymous 
        seasonRank 
        smurfFlag
        countryCode
        isDotaPlusSubscriber
        dotaAccountLevel
        seasonLeaderboardRank
        proSteamAccount {
          isPro
          name
        }
      }
      matches( request: {
        isParsed: true
        gameModeIds: [1,22]
        take: 5
        playerList: SINGLE
      }) {
        id
        analysisOutcome
        durationSeconds
        endDateTime
        players(steamAccountId: $steamid) { isVictory networth level assists kills deaths heroId experiencePerMinute goldPerMinute }
      }
    }
  }
  `;

  const variables = {
    steamid: steamID3
  };

  return fetch(stratzApi, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`
    },
    body: JSON.stringify({ query, variables })
  })
    .then((response) => response.json())
    .then((data) => processAndSendMessage(data))
    .catch((error) => console.error("GraphQL Error:", error));
}

function processAndSendMessage(data) {
  sendMessageLog(data);
  const processedData = processGraphQLData(data);
  sendMessageToContentScript(processedData);
}

function processGraphQLData(data) {
  const playerData = data?.data?.player;
  console.log("PLAYER DATA", data);
  // Use proSteamAccount name if available, otherwise use playerName
  const playerName =
    (playerData?.steamAccount?.proSteamAccount?.isPro &&
      playerData?.steamAccount?.proSteamAccount?.name) ||
    playerData?.steamAccount?.name ||
    "";

  const processedData = {
    playerName: playerName,
    isPro: playerData?.steamAccount?.proSteamAccount?.isPro || false, // Added isPro field
    isAnonymous: playerData?.steamAccount?.isAnonymous || false,
    seasonRank: playerData?.steamAccount?.seasonRank || "",
    smurfFlag: playerData?.steamAccount?.smurfFlag || false,
    seasonLeaderboardRank:
      playerData?.steamAccount?.seasonLeaderboardRank || "",
    matchCount: playerData?.matchCount || 0,
    winCount: playerData?.winCount || 0,
    firstMatchDate: convertTimestampToDate(playerData?.firstMatchDate)
  };

  processedData.medalImage = getMedalImage(processedData.seasonRank);
  processedData.starImage = getStarImage(processedData.seasonRank);
  processedData.leaderboardMedalImage = getLeaderboardMedalImage(
    processedData.seasonRank,
    processedData.seasonLeaderboardRank
  );

  return processedData;
}

function convertTimestampToDate(timestamp) {
  return timestamp ? new Date(timestamp * 1000) : null;
}

function getMedalImage(seasonRank, seasonLeaderboardRank) {
  let imagePath;
  if (seasonRank === 80) {
    imagePath = "images/ranks/medal_8.png";
  } else {
    imagePath = `images/ranks/medal_${Math.floor(seasonRank / 10)}.png`;
  }
  return imagePath;
}

function getStarImage(seasonRank) {
  const parsedSeasonRank = parseInt(seasonRank);
  return parsedSeasonRank &&
    parsedSeasonRank < 80 &&
    parsedSeasonRank % 10 !== 0
    ? `images/ranks/star_${parsedSeasonRank % 10}.png`
    : "";
}

function getLeaderboardMedalImage(seasonRank, seasonLeaderboardRank) {
  const parsedSeasonRank = parseInt(seasonRank);
  const parsedLeaderboardRank = parseInt(seasonLeaderboardRank);

  if (parsedSeasonRank === 80 && !isNaN(parsedLeaderboardRank)) {
    return parsedLeaderboardRank <= 10
      ? "images/ranks/medal_8c.png"
      : parsedLeaderboardRank <= 100
      ? "images/ranks/medal_8b.png"
      : "images/ranks/medal_8.png";
  }

  return "";
}

function sendMessageToContentScript(data) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, {
        action: "updateDotaStats",
        data: data
      });
    } else {
      console.error("No active tab found");
    }
  });
}

function sendMessageLog(data) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, {
        action: "logData",
        data: data
      });
    } else {
      console.error("No active tab found");
    }
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "fetchDotaStats") {
    const steamID3 = Number(request.steamID);
    makeGraphQLRequest(steamID3);
  }
});
