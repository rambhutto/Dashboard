<script setup>
import TestChart from "@/components/TestChart.vue";
import {onMounted, ref, watch} from "vue";

const dashboard = ref("")
const err = ref("")

const currentDataTable = ref({})
let tableau

//Props
let nodes = ref(null)
let edges = ref(null)
let categories = ref(null)
let legend = ref(null)

let worksheets = ref()


let columns = ref([])
//Option Columns
let nameColumn = ref()
let linkColumns = ref()
let sizeColumn = ref(6)
let categoryColumn = ref(2)
let selectedWorkSheet = ref()

onMounted(async () => {
      try {
        tableau = await initTableau()
        let worksheet = await getWorkSheet()
        let dataTable = await getSummaryDataTables(worksheet)
        dataTable = await getSourcesDataTables(worksheet)
        currentDataTable.value = dataTable

        worksheets.value = await getAllWorkSheets()

        convertCellsToJsonObject().then(res => {
          nodes.value = res
        })

        generateLinks().then((res => {
          edges.value = res
        }))
      } catch (error) {
        err.value = error;
      }
    }
)

async function initTableau() {
  let tableauExt = window.tableau.extensions

  try {
    await tableauExt.initializeAsync()
  } catch
      (error) {
    err.value = error
  }
  return tableauExt
}

function log(msg) {
  dashboard.value = dashboard.value + " " + JSON.stringify(msg)
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
  return tableau.dashboardContent.dashboard.worksheets.find(w => w.name === worksheetName)
}

async function getAllWorkSheets() {
  return tableau.dashboardContent.dashboard.worksheets
}

async function convertCellsToJsonObject() {
  if (!(nameColumn.value !== null && typeof nameColumn.value === "object")) {
    return []
  }
  log(nameColumn.value.index)

  let nodeList = []

  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)

  nodeList = []

  let categoriesObj = await generateCategories()
  let pushedCategories = categoriesObj["pushedCategories"]

  dataTable.data.forEach((row, rowIndex) => {
    let node = {}
    row.forEach((col, colIndex) => {
      if (nameColumn.value?.index === colIndex && typeof nameColumn.value === "object") {
        node["name"] = col.value
      }

      if (sizeColumn.value?.index === colIndex && typeof sizeColumn.value === "object") {
        node["size"] = col.value;
      }

      if (categoryColumn.value?.index === colIndex && typeof categoryColumn.value === "object") {
        node["category"] = pushedCategories.indexOf(col.value.toString());
      }
    })
    node["id"] = rowIndex
    nodeList.push(node)
  })

  return nodeList
}

async function getColumns() {
  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)
  columns.value.length = 0
  columns.value.push(...dataTable.columns)
}

async function generateLinks(columnsToLinkOn) {
  if (!(linkColumns.value !== null && typeof linkColumns.value === "object")) {
    return []
  }
  console.log("what")
  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)

  columnsToLinkOn = [linkColumns.value.index]
  let colsToList = {}
  dataTable.data.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
      if (columnsToLinkOn.includes(colIndex)) {
        if (colsToList[colIndex]) {
          colsToList[colIndex].push(col.value)
        } else {
          colsToList[colIndex] = [col.value]
        }
      }
    })
  })

  let linkList = []
  let pushed = []
  //Change the ordering of this for optimization
  dataTable.data.forEach((row, rowIndex) => {
    let link = {}
    row.forEach((col, colIndex) => {
      columnsToLinkOn.forEach((columnToLinkOn) => {
        if (columnsToLinkOn.includes(colIndex)) {
          if (colsToList[columnToLinkOn].includes(col.value) && !pushed.includes(col.value)) {
            let indices = []

            colsToList[columnToLinkOn].forEach((value, index) => {
              if (value === col.value) {
                indices.push(index);
              }
            })

            if (indices.includes(rowIndex) && indices.length > 1) {
              indices.forEach(val => {
                if (rowIndex !== val) {
                  link = {
                    "source": rowIndex,
                    "target": val,
                  }
                  linkList.push(link)
                  pushed.push(col.value)
                }
              })
            }
          }
        }
      })
    })
  })
  return linkList
}

async function generateCategories(column) {
  if (categoryColumn.value !== null && typeof categoryColumn.value === "object") {
    column = categoryColumn.value["index"]
  } else {
    return {"categories": [], "pushedCategories": []}
  }

  let worksheet = await getWorkSheet()
  let dataTable = await getSourcesDataTables(worksheet)

  let categories = []
  let pushedCategories = []
  dataTable.data.forEach((row, rowIndex) => {
    let category = {}
    row.forEach((col, colIndex) => {
      if (column === colIndex && !pushedCategories.includes(col.value)) {
        category["name"] = col.value.toString()
        pushedCategories.push(col.value.toString())
        categories.push(category)
      }
    })
  })
  return {"categories": categories, "pushedCategories": pushedCategories}
}


watch([selectedWorkSheet, nameColumn, linkColumns, sizeColumn, categoryColumn], async () => {
  await getColumns()
  convertCellsToJsonObject().then(res => {
    nodes.value = res
  })

  generateLinks().then((res => {
    edges.value = res
  }))

  generateCategories().then((res => {
    categories.value = res["categories"]
    legend.value = res["pushedCategories"]
  }))
})


</script>

<template>
  <p>{{ err }}</p>
  <p class="text-wrap"> {{ dashboard }} </p>
  <div style="height:600px; min-width:200px">
    <test-chart :nodes="nodes" :edges="edges" :categories="categories" :legend="legend"></test-chart>
  </div>
  <q-select v-model="selectedWorkSheet" clearable optionLabel="name" :options="worksheets"
            label="Select Worksheet"></q-select>
  <q-select v-model="nameColumn" optionLabel="fieldName" showClear :options="columns" label="Name Column"></q-select>
  <q-select v-model="linkColumns" optionLabel="fieldName" showClear :options="columns" label="Connect On"></q-select>
  <q-select v-model="sizeColumn" optionLabel="fieldName" showClear :options="columns" label="Size On"></q-select>
  <q-select v-model="categoryColumn" optionLabel="fieldName" showClear :options="columns" label="Color On"></q-select>
</template>

<style scoped>
</style>
