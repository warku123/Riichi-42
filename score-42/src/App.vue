<template>
  <div id="app">
    <div class="container">
      <h2>麻将分数记录</h2>
      <form @submit.prevent="submitScores" class="score-form">
        <div v-for="(player, index) in players" :key="index" class="player-entry">
          <label :for="'player' + index">玩家 {{ index + 1 }}:</label>
          <select v-model="player.name">
            <option disabled value="">请选择玩家</option>
            <option v-for="name in playerNames" :key="name" :value="name">{{ name }}</option>
          </select>
          <input type="number" v-model.number="player.score" placeholder="分数">
        </div>
        <button type="submit">记录分数</button>
      </form>

      <h2>分数记录</h2>
      <table>
        <tr>
          <th>玩家 1</th>
          <th>玩家 2</th>
          <th>玩家 3</th>
          <th>玩家 4</th>
          <th>总分</th>
        </tr>
        <tr v-for="(record, index) in scoreRecords" :key="index">
          <td>{{ record.players[0].name }} ({{ record.players[0].score }})</td>
          <td>{{ record.players[1].name }} ({{ record.players[1].score }})</td>
          <td>{{ record.players[2].name }} ({{ record.players[2].score }})</td>
          <td>{{ record.players[3].name }} ({{ record.players[3].score }})</td>
          <td>{{ calculateTotal(record.players) }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      players: Array(4).fill().map(() => ({ name: '', score: 0 })),
      playerNames: ['玩家 A', '玩家 B', '玩家 C', '玩家 D'],
      scoreRecords: []
    }
  },
  methods: {
    submitScores() {
      this.scoreRecords.push({ players: JSON.parse(JSON.stringify(this.players)) });
      this.players.forEach(player => player.score = 0); // 重置分数
    },
    calculateTotal(players) {
      return players.reduce((total, player) => total + player.score, 0);
    }
  }
}
</script>

<style>
.container {
  width: 80%;
  margin: auto;
  text-align: center;
}

.score-form {
  margin-bottom: 20px;
}

.player-entry {
  margin-bottom: 10px;
  text-align: center;
}

.player-entry label, .player-entry select, .player-entry input {
  margin-right: 10px;
}

select, input[type="number"] {
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 5px 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

table {
  margin-top: 20px;
  width: 100%;
  border-collapse: collapse;
}

table, th, td {
  border: 1px solid black;
}

th, td {
  padding: 8px;
  text-align: left;
}
</style>
