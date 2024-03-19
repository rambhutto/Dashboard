<script setup>
import TestChart from "@/components/TestChart.vue";
import {onMounted, ref} from "vue";

const dashboard = ref("")
const err = ref("")

const currentDataTable = ref({})
let extensions = ref({})

onMounted(async () => {
      try {
        await initTableau()
        let worksheet = await getWorkSheet()
        let dataTable = await getSummaryDataTables(worksheet)
        dataTable = await getSourcesDataTables(worksheet)
        currentDataTable.value = dataTable
      } catch (error) {
        err.value = error;
      }
    }
)

function log(msg) {
  dashboard.value = dashboard.value + " " + msg
}

async function initTableau() {
  extensions = window.tableau.extensions

  try {
    await extensions.initializeAsync()
    log(extensions.dashboardContent.dashboard.name)
  } catch
      (error) {
    err.value = error
  }
  return extensions
}

async function getSourcesDataTables(worksheet) {//Currently only returns one data table
  const dataSources = await worksheet.getDataSourcesAsync();
  const dataSource = dataSources[0];
  const logicalTables = await dataSource.getLogicalTablesAsync()
  const dataTable = await dataSource.getLogicalTableDataAsync(logicalTables[0].id);

  return dataTable
}

async function getSummaryDataTables(worksheet) {
  const dataTableReader = await worksheet.getSummaryDataReaderAsync();
  const dataTable = await dataTableReader.getAllPagesAsync();
  await dataTableReader.releaseAsync();
  return dataTable
}

async function getWorkSheet(worksheetName) {
  worksheetName = 'Imdb_WS'; // Name of the worksheet, make it dynamic later
  return extensions.dashboardContent.dashboard.worksheets.find(w => w.name === worksheetName)
}

async function convertCellsToJsonObject(colsToInclude) {
  let nodeList = []
  await initTableau()

  colsToInclude = [7, 8]

  let worksheet = await getWorkSheet()
  let dataTable = await getSummaryDataTables(worksheet)
  dataTable = await getSourcesDataTables(worksheet)

  nodeList = []

  dataTable.data.forEach((row, rowIndex) => {
    let node = {}
    row.forEach((col, colIndex) => {
      if (colsToInclude.includes(colIndex)) {
        node[dataTable.columns[colIndex].fieldName] = col.value
      }
    })
    nodeList.push(node)
  })
  return nodeList
}

let nodes = ref(null)
//could just call it in mount
convertCellsToJsonObject().then(res => {
  nodes.value = res
})
</script>

<template>
  <p>{{ err }}</p>
  <v-container>
    <p class="text-wrap"> {{ dashboard }} </p>
  </v-container>
  <test-chart v-if="extensions" :nodes="nodes"></test-chart>
  <v-table fixed-header height="70vh" density="compact">
    <thead>
      <tr>
        <th v-for="(col, index) in currentDataTable.columns" :key="index">{{ col.fieldName }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in currentDataTable.data" :key="rowIndex">
        <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell.value }}</td>
      </tr>
    </tbody>
  </v-table>

</template>

<style scoped>
</style>