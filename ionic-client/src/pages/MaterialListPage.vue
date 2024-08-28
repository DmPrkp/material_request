<template>
  <ion-page>
    <ion-content>
      <ion-refresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
      >
        <ion-refresher-content />
      </ion-refresher>
      <ion-list>
        <ion-item-group
          v-for="component in materialsList"
          :key="component.id"
        >
          <ion-item-divider>
            <ion-label>
              {{ $t(`pages.components.items.${component.title}`) }}
            </ion-label>
          </ion-item-divider>

          <ion-list>
            <ion-item
              v-for="tool in component.hand_tools"
              :key="tool.id"
            >
              <ion-grid>
                <ion-row>
                  <ion-col
                    size="8"
                    class="ion-align-items-center"
                  >
                    <div style="display: inline-block">
                      {{ tool.ru_title }}
                      <span
                        v-for="param in tool.params"
                        :key="param.parameter"
                      >
                        - {{ param.parameter }} {{ param.measure }}
                      </span>
                    </div>
                  </ion-col>

                  <!-- Right side: adjusted consumption -->
                  <ion-col
                    size="4"
                    class="ion-text-right"
                  >
                    {{ tool.adjusted_consumption }} {{ "шт" }}
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-item>
          </ion-list>
        </ion-item-group>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref, toRaw } from "vue";
  import { LocationQuery, useRoute } from "vue-router";
  import type { CalcResponseDTO } from "@/types/dto/index";

  import { RefresherCustomEvent } from "@ionic/vue";
  import BaseModel from "@/models/BaseModel";

  const route = useRoute();

  const materialsList = ref<CalcResponseDTO[]>([]);

  onMounted(async () => {
    const values = await calculateValues();
    materialsList.value = values;
    console.log(values);
  });

  function parseData(query: LocationQuery) {
    const { components, crew } = query;
    if (!components || typeof components !== "string") return {};
    return { components: JSON.parse(components), crew };
  }

  // fetch func
  async function calculateValues() {
    const { system } = route.params;
    const { components, crew } = parseData(route.query);
    if (!components || !crew) return [];
    const dataToSend = { components, crew };
    const data = await BaseModel.post<CalcResponseDTO[]>(
      `/calc/${system}`,
      [],
      {
        body: JSON.stringify(dataToSend),
      }
    );
    return data || [];
  }

  // ionic functions
  async function handleRefresh(event: RefresherCustomEvent) {
    event.target.complete();
  }
</script>

<style>
  .full-volume-block {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0 15px 0 15px;
  }

  .full-volume-block_input {
    flex: 1;
    --placeholder-width: 150px;
  }

  .custom-item {
    display: flex;
    align-items: center;
  }

  ion-label {
    flex: 1; /* Take available space */
    min-width: 250px; /* Minimum width of label */
    white-space: nowrap; /* Prevent text wrapping */
    overflow: hidden; /* Hide overflow text */
    text-overflow: ellipsis; /* Add ellipsis for overflow text */
  }

  ion-input {
    flex: 2; /* Adjust based on your layout needs */
  }
</style>
