/* Faction data: Autobot and Decepticon fleets that share the standard Battleship sizes. */
(function (root, factory) {
  const game =
    typeof module === 'object' && module.exports ? require('./game.js') : root.BattleshipGame;
  const api = factory(game);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BattleshipFactions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (game) {
  const { SHIPS } = game;

  const FACTIONS = {
    autobots: {
      id: 'autobots',
      name: 'Autobots',
      leader: 'Optimus Prime',
      motto: 'Freedom is the right of all sentient beings.',
      rally: 'Autobots, roll out!',
      fleetLabel: 'Autobot convoy',
      fleet: [
        { name: 'Optimus Prime', vehicle: 'Semi truck', image: 'img/autobot-optimus.svg' },
        { name: 'Ironhide', vehicle: 'Armoured pickup', image: 'img/autobot-ironhide.svg' },
        { name: 'Ratchet', vehicle: 'Rescue truck', image: 'img/autobot-ratchet.svg' },
        { name: 'Jazz', vehicle: 'Sports car', image: 'img/autobot-jazz.svg' },
        { name: 'Bumblebee', vehicle: 'Compact car', image: 'img/autobot-bumblebee.svg' },
      ],
    },
    decepticons: {
      id: 'decepticons',
      name: 'Decepticons',
      leader: 'Megatron',
      motto: 'Peace through tyranny.',
      rally: 'Decepticons, attack!',
      fleetLabel: 'Decepticon strike force',
      fleet: [
        { name: 'Megatron', vehicle: 'Fusion tank', image: 'img/decepticon-megatron.svg' },
        { name: 'Starscream', vehicle: 'Fighter jet', image: 'img/decepticon-starscream.svg' },
        { name: 'Blackout', vehicle: 'Attack helicopter', image: 'img/decepticon-blackout.svg' },
        { name: 'Barricade', vehicle: 'Police cruiser', image: 'img/decepticon-barricade.svg' },
        { name: 'Frenzy', vehicle: 'Scout buggy', image: 'img/decepticon-frenzy.svg' },
      ],
    },
  };

  Object.values(FACTIONS).forEach((faction) => {
    faction.fleet.forEach((unit, index) => {
      unit.size = SHIPS[index].size;
      unit.role = SHIPS[index].name;
    });
  });

  function opposing(id) {
    return id === 'autobots' ? FACTIONS.decepticons : FACTIONS.autobots;
  }

  function unitFor(faction, name) {
    return faction.fleet.find((unit) => unit.name === name) || null;
  }

  return { FACTIONS, opposing, unitFor };
});
