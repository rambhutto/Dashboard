<script setup>
import TestChart from "@/components/TestChart.vue";
import {onMounted, ref, watch} from "vue";
import Dropdown from 'primevue/dropdown';

const dashboard = ref("")
const err = ref("")

const currentDataTable = ref({})
let extensions = ref({})

let worksheets = ref()
onMounted(async () => {
      try {
        await initTableau()
        let worksheet = await getWorkSheet()
        let dataTable = await getSummaryDataTables(worksheet)
        dataTable = await getSourcesDataTables(worksheet)
        currentDataTable.value = dataTable

        worksheets.value = await getAllWorkSheets()
      } catch (error) {
        err.value = error;
      }
    }
)

function log(msg) {
  dashboard.value = dashboard.value + " " + JSON.stringify(msg)
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
  worksheetName = "Imdb_WS"
  if (selectedWorkSheet.value != null) {
    worksheetName = selectedWorkSheet.value.name; // Name of the worksheet, make it dynamic later
  }
  return extensions.dashboardContent.dashboard.worksheets.find(w => w.name === worksheetName)
}

async function getAllWorkSheets() {
  return extensions.dashboardContent.dashboard.worksheets
}

async function convertCellsToJsonObject(colsToInclude) {
  let nodeList = []
  await initTableau()

  colsToInclude = [7, 8]

  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)

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
  //Find out columns in the sheet

  return nodeList
}

async function getColumns() {
  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)
  columns.value.length = 0
  columns.value.push(...dataTable.columns)
}

let nodes = ref(null)
let columns = ref([])
// could just call it in mount
convertCellsToJsonObject().then(res => {
  nodes.value = res
})
let selectedColumns = ref()
let selectedWorkSheet = ref()

watch((selectedWorkSheet), async () => {
  console.log("changed")
  await getColumns()
})
</script>

<template>
  <v-app>
    <p>{{ err }}</p>
    <p class="text-wrap"> {{ dashboard }} </p>
    <p class="text-wrap"> {{ selectedColumns }} </p>
    <p class="text-wrap" v-if="selectedWorkSheet"> {{ selectedWorkSheet.name }} </p>

    <Dropdown v-model="selectedWorkSheet" optionLabel="name" :options="worksheets" placeholder="Select Worksheet"
              class="w-full md:w-14rem"/>
    <Dropdown v-model="selectedColumns" optionLabel="fieldName" showClear :options="columns" placeholder="Node"
              class="w-full md:w-14rem"/>
    <!--  <test-chart v-if="extensions" :nodes="nodes"></test-chart>-->
    <v-table v-if="false" fixed-header height="70vh" density="compact">
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
  </v-app>
</template>

<style scoped>
</style>
