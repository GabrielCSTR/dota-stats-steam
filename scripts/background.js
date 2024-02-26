chrome.runtime.onInstalled.addListener(() => {
  fetch(chrome.runtime.getURL("config.json"))
    .then((response) => response.json())
    .then((data) => {
      chrome.storage.local.set({ config: data });
    });
});

let bearerToken = "";
let stratzApi = "";
let processedData = "";
let allHeros = "";

chrome.storage.local.get("config", (data) => {
  bearerToken = data.config.STRATZ_TOKEN;
  stratzApi = data.config.STRATZ_GQL;
});

async function makeGraphQLProfileRequest(steamID3) {
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
        guild{
          guild{
            name
            motd
            logo
            tag
          }
        }
        battlepass{
          level
        }
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

  await getRequestAPIStratz(stratzApi, query, variables, "playerInfo");
}

async function makeGraphQLHerosRequest() {
  const query = `
  query GetAllHeroes {
    constants {
      heroes {
        id
        name
        displayName
        shortName
        stats {
          primaryAttribute
        }
      }
    }
  }
  `;
  await getRequestAPIStratz(stratzApi, query, null, "allHeros");
}

async function getRequestAPIStratz(stratzApi, query, variables, type) {
  return await fetch(stratzApi, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`
    },
    body: JSON.stringify({ query, variables })
  })
    .then((response) => response.json())
    .then((data) => processAndSendMessage(data, type))
    .catch((error) => console.error("GraphQL Error:", error));
}

function processAndSendMessage(data, type) {
  // sendMessageLog(data);
  if (type === "playerInfo") {
    processedData = data?.data?.player;
  }
  if (type === "allHeros") {
    allHeros = data?.data?.constants?.heroes;
  }
  processGraphQLPlayer();
  processedData = processGraphQLData(data);
  sendMessageToContentScript(processedData);
}
function processGraphQLPlayer() {
  if (processedData.simpleSummary) {
    processedData?.MatchGroupByHero.find((hero) => {
      const bestHero = allHeros.find((item) => item.id === hero.heroId);
      hero.displayName = bestHero.displayName;
      hero.shortName = bestHero.shortName;
    });
    sendMessageLog(processedData);
  }
}

function verificarHeroId(heroes, heroId) {
  return heroes.find((hero) => hero.heroId === heroId) || null;
}

function processGraphQLData(data) {
  const playerData = data?.data?.player;
  // Use proSteamAccount name if available, otherwise use playerName
  const playerName =
    (playerData?.steamAccount?.proSteamAccount?.isPro &&
      playerData?.steamAccount?.proSteamAccount?.name) ||
    playerData?.steamAccount?.name ||
    "";

  const processedData = {
    playerName: playerName,
    countryCode: playerData?.steamAccount?.countryCode,
    isPro: playerData?.steamAccount?.proSteamAccount?.isPro || false, // Added isPro field
    isAnonymous: playerData?.steamAccount?.isAnonymous || false,
    seasonRank: playerData?.steamAccount?.seasonRank || "",
    smurfFlag: playerData?.steamAccount?.smurfFlag || false,
    isDotaPlusSubscriber:
      playerData?.steamAccount?.isDotaPlusSubscriber || false,
    seasonLeaderboardRank:
      playerData?.steamAccount?.seasonLeaderboardRank || "",
    matchCount: playerData?.matchCount || 0,
    winCount: playerData?.winCount || 0,
    firstMatchDate: convertTimestampToDate(playerData?.firstMatchDate),
    MatchGroupByHero: playerData?.MatchGroupByHero,
    battlepass_level: playerData?.steamAccount?.battlepass[0]?.level || "",
    guild_name: playerData?.steamAccount?.guild?.guild.name || "",
    guild_desc: playerData?.steamAccount?.guild?.guild.motd || "",
    guild_tag: playerData?.steamAccount?.guild?.guild.tag || ""
  };

  processedData.medalImage = getMedalImage(processedData?.seasonRank);
  processedData.starImage = getStarImage(processedData?.seasonRank);
  processedData.leaderboardMedalImage = getLeaderboardMedalImage(
    processedData?.seasonRank,
    processedData?.seasonLeaderboardRank
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

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  if (request.action === "fetchDotaStats") {
    const steamID3 = Number(request.steamID);
    await makeGraphQLHerosRequest(); // get all heros
    await makeGraphQLProfileRequest(steamID3); // get player info
  }
});
