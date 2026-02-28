import { applyMiddleware, createStore } from "redux";
import socketReducer from "../reducers/reducer";
import { thunk } from "redux-thunk";
import { logger } from "redux-logger/src";

const store = createStore(
    socketReducer,
    applyMiddleware(thunk, logger)
);

export default store;