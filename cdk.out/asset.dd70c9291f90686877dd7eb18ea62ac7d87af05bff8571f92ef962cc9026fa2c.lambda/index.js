"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/ecs-deployment-provider/on-event.lambda.ts
var on_event_lambda_exports = {};
__export(on_event_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(on_event_lambda_exports);
var import_client_codedeploy = require("@aws-sdk/client-codedeploy");

// src/ecs-deployment-provider/logger.ts
var Logger = class {
  constructor() {
    this.persistentAttributes = {};
  }
  info(message, ...attributes) {
    process.stdout.write(this.formatMessage(message, { level: "INFO" }, ...attributes) + "\n");
  }
  warn(message, ...attributes) {
    process.stdout.write(this.formatMessage(message, { level: "WARN" }, ...attributes) + "\n");
  }
  error(message, ...attributes) {
    process.stdout.write(this.formatMessage(message, { level: "ERROR" }, ...attributes) + "\n");
  }
  appendKeys(attributes) {
    this.persistentAttributes = { ...this.persistentAttributes, ...attributes };
  }
  formatMessage(message, ...attributes) {
    const formattedMessage = [this.persistentAttributes, ...attributes].reduce((combined, current) => {
      return { ...combined, ...current };
    }, { message });
    return JSON.stringify(formattedMessage);
  }
};

// src/ecs-deployment-provider/on-event.lambda.ts
async function handler(event) {
  const logger = new Logger();
  const codedeployClient = new import_client_codedeploy.CodeDeploy({});
  logger.appendKeys({
    stackEvent: event.RequestType
  });
  switch (event.RequestType) {
    case "Create":
    case "Update": {
      const props = event.ResourceProperties;
      let autoRollbackConfiguration;
      if (props.autoRollbackConfigurationEnabled === "true") {
        autoRollbackConfiguration = {
          enabled: true,
          events: props.autoRollbackConfigurationEvents.split(",")
        };
      } else if (props.autoRollbackConfigurationEnabled === "false") {
        autoRollbackConfiguration = {
          enabled: false
        };
      }
      const resp = await codedeployClient.createDeployment({
        applicationName: props.applicationName,
        deploymentConfigName: props.deploymentConfigName,
        deploymentGroupName: props.deploymentGroupName,
        autoRollbackConfiguration,
        description: props.description,
        revision: {
          revisionType: "AppSpecContent",
          appSpecContent: {
            content: props.revisionAppSpecContent
          }
        }
      });
      if (!resp.deploymentId) {
        throw new Error("No deploymentId received from call to CreateDeployment");
      }
      logger.appendKeys({
        deploymentId: resp.deploymentId
      });
      logger.info("Created new deployment");
      return {
        PhysicalResourceId: resp.deploymentId,
        Data: {
          deploymentId: resp.deploymentId
        }
      };
    }
    case "Delete":
      logger.appendKeys({
        deploymentId: event.PhysicalResourceId
      });
      try {
        const resp = await codedeployClient.stopDeployment({
          deploymentId: event.PhysicalResourceId,
          autoRollbackEnabled: true
        });
        logger.info(`Stopped deployment: ${resp.status} ${resp.statusMessage}`);
      } catch (e) {
        logger.warn("Ignoring error", { error: e });
      }
      return {
        PhysicalResourceId: event.PhysicalResourceId,
        Data: {
          deploymentId: event.PhysicalResourceId
        }
      };
    default:
      logger.error("Unknown stack event");
      throw new Error(`Unknown request type: ${event.RequestType}`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
