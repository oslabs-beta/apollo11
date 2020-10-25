import React from 'react';
import {EventLogContainer} from './managedlog/eventObject';

// Listen for messages from the contentScript
// The contentScript will send to the App:
// - Apollo Client URI
// - Apollo Client cache
export default function createApolloClientListener(
  setApolloURI: React.Dispatch<React.SetStateAction<string>>,
  setStores: React.Dispatch<React.SetStateAction<{}>>,
  eventList: EventLogContainer,
  setEvents: React.Dispatch<React.SetStateAction<{}>>,
) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const {tabId} = chrome.devtools.inspectedWindow;

    // Ignore any messages from contentScripts that aren't on the same tab
    // as the currently open Apollo devtools tab
    if (tabId !== sender.tab.id) {
      // sendResponse(`App on ${tabId} ignoring message from ${sender.tab.id}`);
      return;
    }

    sendResponse(`App on ${tabId} accepting message from ${sender.tab.id}`);

    if (request.type === 'INITIAL') {
      setApolloURI(request.apolloURI);
    }

    // Check if this is the initial message sent by the contentScript
    // i.e., received without a pre-generated eventId,
    // so set eventId to zero so it is the smallest value key in the events object
    // This keeps the first cache sent to be chronologically the first one in the events object
    let {eventId} = request;
    if (eventId === 'null') {
      eventId = '0';
    }

    setStores((prevStores: any) => {
      const newStores = {...prevStores};
      const {
        action,
        cache,
        inspector,
        queries,
        mutations,
        queryManager,
      } = request;

      const event: any = {};
      if (!newStores[eventId]) {
        newStores[eventId] = {};
      }

      newStores[eventId] = {...prevStores[eventId], ...event};
      newStores[eventId].cache = cache;
      newStores[eventId].action = action;
      newStores[eventId].inspector = inspector;
      newStores[eventId].queries = queries;
      newStores[eventId].mutations = mutations;
      newStores[eventId].queryManager = queryManager;
      newStores.lastEventId = eventId;

      eventList.sequenceApolloLog({queryManager, eventId, cache}, setEvents);
      return newStores;
    });
  });
}

// Send a message to the contentScript to get the Apollo Client cache
// Need to pass it the pre-generated eventId so it can correlate the cache + data
// with its corresponding network request
export function getApolloClient() {
  // Get the active tab and send a message to the contentScript to get the cache
  chrome.tabs.query({active: true}, function getClientData(tabs) {
    if (tabs.length) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'GET_APOLLO_CLIENT',
      });
    }
  });
}
