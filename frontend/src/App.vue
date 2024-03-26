<script setup>
import TestChart from "@/components/TestChart.vue";
import {onMounted, ref, watch} from "vue";

const dashboard = ref("")

let tableau

//Props
let nodes = ref(null)
let edges = ref(null)
let categories = ref(null)
let legend = ref(null)

let worksheets = ref()

//WorkSheet
let selectedWorkSheet = ref()
//All Columns
let columns = ref([])
let numericColumns = ref([])
//Option Columns
let nameColumn = ref()
let linkColumns = ref()
let sizeColumn = ref()
let categoryColumn = ref()
//Use underlying data
let useUnderLyingData = ref(false)
//Settings Button
let settingsButtonDisabled = ref(false)

onMounted(async () => {
      try {
        tableau = await initTableau()
        worksheets.value = await getAllWorkSheets()
        await setSettings()
      } catch (error) {
        console.log(error)
      }
    }
)

//Improve later
async function setSettings() {
  let settings = tableau.settings.getAll()
  console.log(settings)
  if (settings.hasOwnProperty("selectedWorkSheet")) {
    selectedWorkSheet.value = {}
    selectedWorkSheet.value.name = settings["selectedWorkSheet"]
  }
  await getColumns()

  if (settings.hasOwnProperty("useUnderLyingData")) {
    useUnderLyingData.value = JSON.parse(settings["useUnderLyingData"].toLowerCase())
  }

  if (settings.hasOwnProperty("nameColumn")) {
    nameColumn.value = columns.value[settings["nameColumn"]]
  }

  if (settings.hasOwnProperty("linkColumns")) {
    linkColumns.value = columns.value[settings["linkColumns"]]
  }

  if (settings.hasOwnProperty("sizeColumn")) {
    sizeColumn.value = columns.value[settings["sizeColumn"]]
  }

  if (settings.hasOwnProperty("categoryColumn")) {
    categoryColumn.value = columns.value[settings["categoryColumn"]]
  }
  console.log(selectedWorkSheet)
}

async function initTableau() {
  let tableauExt = window.tableau.extensions

  try {
    await tableauExt.initializeAsync()
  } catch
      (error) {
    console.log(error)
  }
  return tableauExt
}

function log(msg) {
  dashboard.value = dashboard.value + " " + JSON.stringify(msg)
}

async function getWorkSheet(worksheetName) {
  if (selectedWorkSheet.value != null) {
    worksheetName = selectedWorkSheet.value.name; // Name of the worksheet, make it dynamic later
    return tableau.dashboardContent.dashboard.worksheets.find(w => w.name === worksheetName)
  }
}

async function getAllWorkSheets() {
  return tableau.dashboardContent.dashboard.worksheets
}

async function getDataTables(worksheet) {
  return useUnderLyingData.value ? getSourcesDataTables(worksheet) : getSummaryDataTables(worksheet)
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


async function convertCellsToJsonObject() {
  if (!(nameColumn.value !== null && typeof nameColumn.value === "object")) {
    return []
  }

  let nodeList = []

  let worksheet = await getWorkSheet()
  let dataTable = await getDataTables(worksheet)
  let categoriesObj = await generateCategories()
  let pushedCategories = categoriesObj["pushedCategories"]

  dataTable.data.forEach((row, rowIndex) => {
    const node = {
      id: rowIndex,
      name: "",
      size: 25,
      category: ""
    }

    row.forEach((col, colIndex) => {
      if (nameColumn.value?.index === colIndex) {
        node["name"] = col.value
      }

      if (sizeColumn.value?.index === colIndex) {
        node["size"] = col.value;
      }

      if (categoryColumn.value?.index === colIndex) {
        node["category"] = pushedCategories.indexOf(col.value.toString());
      }
    })
    nodeList.push(node)
  })

  return nodeList
}

async function getColumns() {
  let worksheet = await getWorkSheet()
  let dataTable = await getDataTables(worksheet)

  columns.value.length = 0
  columns.value.push(...dataTable.columns)

  numericColumns.value.length = 0
  numericColumns.value.push(...dataTable.columns.filter(column => column.dataType === "int" || column.dataType === "float"))
}

async function generateLinks(columnsToLinkOn) {
  if (!(linkColumns.value !== null && typeof linkColumns.value === "object")) {
    return []
  }

  let worksheet = await getWorkSheet()
  let dataTable = await getDataTables(worksheet)

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
  //Change the ordering of this for optimization/performance
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
  let dataTable = await getDataTables(worksheet)

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

function clearColumnsValues() {
  nameColumn.value = null
  linkColumns.value = null
  sizeColumn.value = null
  categoryColumn.value = null
}

watch([selectedWorkSheet, useUnderLyingData, nameColumn, linkColumns, sizeColumn, categoryColumn], async () => {
  await getColumns()
  nodes.value = await convertCellsToJsonObject()
  edges.value = await generateLinks()

  let cat = await generateCategories()
  categories.value = cat["categories"]
  legend.value = cat["pushedCategories"]
})


//Lazy settings Save
async function setAndSaveSettings() {
  settingsButtonDisabled.value = true
  if (selectedWorkSheet.value !== null && selectedWorkSheet.value !== undefined) {
    tableau.settings.set("selectedWorkSheet", selectedWorkSheet.value.name);
  }

  if (useUnderLyingData.value !== null && useUnderLyingData.value !== undefined) {
    tableau.settings.set("useUnderLyingData", useUnderLyingData.value);
  }

  if (nameColumn.value !== null && nameColumn.value !== undefined) {
    tableau.settings.set("nameColumn", nameColumn.value.index);
  }

  if (linkColumns.value !== null && linkColumns.value !== undefined) {
    tableau.settings.set("linkColumns", linkColumns.value.index);
  }

  if (sizeColumn.value !== null && sizeColumn.value !== undefined) {
    tableau.settings.set("sizeColumn", sizeColumn.value.index);
  }

  if (categoryColumn.value !== null && categoryColumn.value !== undefined) {
    tableau.settings.set("categoryColumn", categoryColumn.value.index);
  }
  await tableau.settings.saveAsync()
  settingsButtonDisabled.value = false
  console.log("Settings saved")
}

</script>

<template>
  <p class="text-wrap"> {{ dashboard }} </p>
  <div style="height:600px; min-width:200px">
    <test-chart :nodes="nodes" :edges="edges" :categories="categories" :legend="legend"></test-chart>
  </div>
  <div>
    <div class="row">
      <div class="col  ">
        <q-select v-model="selectedWorkSheet" clearable optionLabel="name" :options="worksheets"
                  label="Select Worksheet"></q-select>
      </div>
      <div class="col">
        <q-checkbox v-model="useUnderLyingData" label="Use Underlying Raw Data"
                    @click="clearColumnsValues()"></q-checkbox>
      </div>
    </div>
    <div class="row">
      <div class="col q-mr-md">
        <q-select v-model="nameColumn" optionLabel="fieldName" showClear :options="columns"
                  label="Name Column"></q-select>
      </div>
      <div class="col">
        <q-select v-model="linkColumns" optionLabel="fieldName" showClear :options="columns"
                  label="Connect On"></q-select>
      </div>
    </div>
    <div class="row">
      <div class="col q-mr-md">
        <q-select v-model="sizeColumn" optionLabel="fieldName" showClear :options="numericColumns"
                  label="Size On"></q-select>
      </div>
      <div class="col">
        <q-select v-model="categoryColumn" optionLabel="fieldName" showClear :options="columns"
                  label="Color On"></q-select>
      </div>
    </div>

    <div class="row">
      <div class="col q-mr-md">
        <q-btn @click="setAndSaveSettings()" :disable="settingsButtonDisabled">Save Data</q-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
