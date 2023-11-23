<template>
  <div id="app">
    <h2>数据输入</h2>
    <form @submit.prevent="submitData">
      <label for="dataInput">输入内容：</label>
      <input type="text" v-model="inputData">
      <input type="submit" value="提交">
    </form>

    <h2>数据展示</h2>
    <table>
      <tr>
        <th>内容</th>
      </tr>
      <tr v-for="(item, index) in dataItems" :key="index">
        <td>{{ item }}</td>
      </tr>
    </table>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      inputData: '',
      dataItems: []
    }
  },
  methods: {
    submitData() {
      if (this.inputData.trim() === '') return;
      this.dataItems.push(this.inputData);
      this.inputData = '';
    }
  }
}
</script>

<style>
table, th, td {
  border: 1px solid black;
  border-collapse: collapse;
}
th, td {
  padding: 5px;
  text-align: left;
}
</style>
