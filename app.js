const groupData = require('./groups.json');
const exibitionData = require('./exibitions.json');

const minScore = 60;
const maxScore = 120;

const groupPoints = { A: {}, B: {}, C: {} };
const groupMatches = { A: [], B: [], C: [] };
const groupStats = { A: {}, B: {}, C: {} };
const rankedTeams = []; // Array for team ranking

// Logistic probability equation
const getWinProbability = (team1, team2, k) =>
  1 / (1 + Math.exp(-k * (team2.FIBARanking - team1.FIBARanking)));

// Turns probability that is in range [0, 1], to a range, by default to [60, 120]
const scale = (value, min = minScore, max = maxScore) =>
  Math.round(max + value * (min - max));

// Match results
const getMatchResult = (team1, team2) => {
  const team1Score = scale(Math.random());
  const team2Score = scale(Math.random());

  const winner = team1Score > team2Score ? team1.ISOCode : team2.ISOCode;
  const loser = team1Score > team2Score ? team2.ISOCode : team1.ISOCode;

  return {
    team1Score,
    team2Score,
    winner,
    loser
  };
};

// Initializing group points and team
const buildGroupPoints = () => {
  ['A', 'B', 'C'].forEach(group => {
    groupData[group].forEach(team => {
      groupPoints[group][team.ISOCode] = 0;
      groupStats[group][team.ISOCode] = {
        wins: 0,
        losses: 0,
        pointsScored: 0,
        pointsAgainst: 0,
      };
    });
  });
};

// Group matches
const playGroup = group => {
  for (let i = 0; i < groupData[group].length; i++) {
    for (let j = i + 1; j < groupData[group].length; j++) {
      const result = getMatchResult(groupData[group][i], groupData[group][j]);
      const { winner, loser, team1Score, team2Score } = result;
      groupPoints[group][winner] += 2;
      groupPoints[group][loser] += 1;

      groupStats[group][winner].wins += 1;
      groupStats[group][loser].losses += 1;

      groupStats[group][winner].pointsScored += team1Score;
      groupStats[group][winner].pointsAgainst += team2Score;

      groupStats[group][loser].pointsScored += team2Score;
      groupStats[group][loser].pointsAgainst += team1Score;

      groupMatches[group].push(result);
    }
  }
};

// Determinating group winners
const determineGroupWinners = () => {
  Object.keys(groupData).forEach(group => {
    const sortedTeams = Object.keys(groupStats[group]).sort((teamA, teamB) => {
      const statsA = groupStats[group][teamA];
      const statsB = groupStats[group][teamB];

      // Sort by group points
      const pointsDifference = groupPoints[group][teamB] - groupPoints[group][teamA];
      if (pointsDifference !== 0) return pointsDifference;

      // If group points are equal, sort by point difference
      const pointDifferenceA = statsA.pointsScored - statsA.pointsAgainst;
      const pointDifferenceB = statsB.pointsScored - statsB.pointsAgainst;
      if (pointDifferenceA !== pointDifferenceB) return pointDifferenceB - pointDifferenceA;

      // If points and point difference are equal, sort by match beetwen these two teams
      const headToHeadMatch = groupMatches[group].find(
        match => (match.winner === teamA && match.loser === teamB) ||
          (match.winner === teamB && match.loser === teamA)
      );
      if (headToHeadMatch) {
        return headToHeadMatch.winner === teamA ? -1 : 1;
      }

      return 0;
    });

    console.log(`\nGrupa ${group} (Ime - pobede/porazi/bodovi/postignuti koševi/primljeni koševi/koš razlika):`);
    sortedTeams.forEach(team => {
      const stats = groupStats[group][team];
      const points = groupPoints[group][team];
      const pointDifference = stats.pointsScored - stats.pointsAgainst;
      console.log(
        `${team}  ${stats.wins} / ${stats.losses} / ${points} / ${stats.pointsScored} / ${stats.pointsAgainst} / ${pointDifference > 0 ? '+' : ''}${pointDifference}`
      );
      rankedTeams.push({ team, points, pointDifference }); // add ranked teams to list
    });
  });

  rankedTeams.sort((a, b) => b.points - a.points || b.pointDifference - a.pointDifference);
};

// Hat-seeds
const seedTeams = {
  D: [], // rank 1 and 2
  E: [], // rank 3 and 4
  F: [], // rank 5 and 6
  G: []  // rank 7 and 8
};

const assignSeeds = () => {
  const sortedTeams = rankedTeams.map(ranked => ranked.team);

  seedTeams.D = sortedTeams.slice(0, 2);
  seedTeams.E = sortedTeams.slice(2, 4);
  seedTeams.F = sortedTeams.slice(4, 6);
  seedTeams.G = sortedTeams.slice(6, 8);

  console.log('\nŠeširi:');
  Object.keys(seedTeams).forEach(seed => {
    console.log(` Šešir ${seed}`);
    seedTeams[seed].forEach(team => console.log(`    ${team}`));
  });
};

// Random pairs for quarter-finals
const shuffleArray = array => {
  return array.sort(() => Math.random() - 0.5);
};

// Initializing quarter finalists
const formQuarterfinals = () => {
  const quarterfinals = [];
  const shuffledD = shuffleArray(seedTeams.D);
  const shuffledG = shuffleArray(seedTeams.G);
  const shuffledE = shuffleArray(seedTeams.E);
  const shuffledF = shuffleArray(seedTeams.F);

  shuffledD.forEach(teamD => {
    const teamG = shuffledG.find(team => !groupMatches.A.some(match =>
      (match.winner === teamD && match.loser === team) ||
      (match.winner === team && match.loser === teamD)
    ));
    if (teamG) {
      quarterfinals.push({ team1: teamD, team2: teamG });
      shuffledG.splice(shuffledG.indexOf(teamG), 1);
    }
  });

  shuffledE.forEach(teamE => {
    const teamF = shuffledF.find(team => !groupMatches.A.some(match =>
      (match.winner === teamE && match.loser === team) ||
      (match.winner === team && match.loser === teamE)
    ));
    if (teamF) {
      quarterfinals.push({ team1: teamE, team2: teamF });
      shuffledF.splice(shuffledF.indexOf(teamF), 1);
    }
  });

  return quarterfinals;
};

// Quarter-finals
const playQuarterfinals = (quarterfinals) => {
  console.log("\nČetvrtfinale:");
  return quarterfinals.map(({ team1, team2 }) => {
    const team1Data = groupData.A.find(team => team.ISOCode === team1) ||
      groupData.B.find(team => team.ISOCode === team1) ||
      groupData.C.find(team => team.ISOCode === team1);
    const team2Data = groupData.A.find(team => team.ISOCode === team2) ||
      groupData.B.find(team => team.ISOCode === team2) ||
      groupData.C.find(team => team.ISOCode === team2);

    const result = getMatchResult(team1Data, team2Data);

    console.log(`${team1} - ${team2} (${result.team1Score}: ${result.team2Score})`);
    return result;
  });
};

// Semi-finals
const playSemifinals = (quarterfinalResults) => {
  const semifinals = [
    { team1: quarterfinalResults[0].winner, team2: quarterfinalResults[1].winner },
    { team1: quarterfinalResults[2].winner, team2: quarterfinalResults[3].winner }
  ];

  console.log("\nPolufinale:");
  const semifinalResults = semifinals.map(({ team1, team2 }) => {
    const team1Data = groupData.A.find(team => team.ISOCode === team1) ||
      groupData.B.find(team => team.ISOCode === team1) ||
      groupData.C.find(team => team.ISOCode === team1);
    const team2Data = groupData.A.find(team => team.ISOCode === team2) ||
      groupData.B.find(team => team.ISOCode === team2) ||
      groupData.C.find(team => team.ISOCode === team2);

    const result = getMatchResult(team1Data, team2Data);

    console.log(`${team1} - ${team2} (${result.team1Score}: ${result.team2Score})`);
    return result;
  });

  return semifinalResults;
};

// Third place match
const playThirdPlaceMatch = (semifinalResults) => {
  const thirdPlaceMatch = {
    team1: semifinalResults[0].loser,
    team2: semifinalResults[1].loser
  };

  console.log("\nUtakmica za treće mesto:");
  const result = getMatchResult(
    groupData.A.find(team => team.ISOCode === thirdPlaceMatch.team1) ||
    groupData.B.find(team => team.ISOCode === thirdPlaceMatch.team1) ||
    groupData.C.find(team => team.ISOCode === thirdPlaceMatch.team1),
    groupData.A.find(team => team.ISOCode === thirdPlaceMatch.team2) ||
    groupData.B.find(team => team.ISOCode === thirdPlaceMatch.team2) ||
    groupData.C.find(team => team.ISOCode === thirdPlaceMatch.team2)
  );

  console.log(`${thirdPlaceMatch.team1} - ${thirdPlaceMatch.team2} (${result.team1Score}: ${result.team2Score})`);
  return result;
};

// Finals
const playFinal = (semifinalResults) => {
  const finalMatch = {
    team1: semifinalResults[0].winner,
    team2: semifinalResults[1].winner
  };

  console.log("\nFinale:");
  const result = getMatchResult(
    groupData.A.find(team => team.ISOCode === finalMatch.team1) ||
    groupData.B.find(team => team.ISOCode === finalMatch.team1) ||
    groupData.C.find(team => team.ISOCode === finalMatch.team1),
    groupData.A.find(team => team.ISOCode === finalMatch.team2) ||
    groupData.B.find(team => team.ISOCode === finalMatch.team2) ||
    groupData.C.find(team => team.ISOCode === finalMatch.team2)
  );

  console.log(`${finalMatch.team1} - ${finalMatch.team2} (${result.team1Score}: ${result.team2Score})`);
  return result;
};

const main = () => {
  buildGroupPoints();
  ['A', 'B', 'C'].forEach(playGroup);
  console.log('group matches', groupMatches);
  determineGroupWinners();
  assignSeeds();

  const quarterfinals = formQuarterfinals();
  const quarterfinalResults = playQuarterfinals(quarterfinals);

  const semifinalResults = playSemifinals(quarterfinalResults);
  const thirdPlaceResult = playThirdPlaceMatch(semifinalResults);
  const finalResult = playFinal(semifinalResults); shuffleArray

  console.log("\nMedalje:");
  console.log(`1. ${finalResult.winner}`);
  console.log(`2. ${finalResult.loser}`);
  console.log(`3. ${thirdPlaceResult.winner}`);
};

main();
