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

// src/ecs-deployment-provider/is-complete.lambda.ts
var is_complete_lambda_exports = {};
__export(is_complete_lambda_exports, {
  DeploymentStatus: () => DeploymentStatus,
  handler: () => handler
});
module.exports = __toCommonJS(is_complete_lambda_exports);
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

// src/ecs-deployment-provider/is-complete.lambda.ts
var DeploymentStatus = /* @__PURE__ */ ((DeploymentStatus2) => {
  DeploymentStatus2["CREATED"] = "Created";
  DeploymentStatus2["QUEUED"] = "Queued";
  DeploymentStatus2["IN_PROGRESS"] = "InProgress";
  DeploymentStatus2["BAKING"] = "Baking";
  DeploymentStatus2["SUCCEEDED"] = "Succeeded";
  DeploymentStatus2["FAILED"] = "Failed";
  DeploymentStatus2["STOPPED"] = "Stopped";
  DeploymentStatus2["READY"] = "Ready";
  return DeploymentStatus2;
})(DeploymentStatus || {});
async function handler(event) {
  const logger = new Logger();
  const codedeployClient = new import_client_codedeploy.CodeDeploy({});
  try {
    const resp = await codedeployClient.getDeployment({ deploymentId: event.PhysicalResourceId });
    let rollbackResp = {};
    if (resp.deploymentInfo?.rollbackInfo?.rollbackDeploymentId) {
      rollbackResp = await codedeployClient.getDeployment({ deploymentId: resp.deploymentInfo?.rollbackInfo?.rollbackDeploymentId });
    }
    logger.appendKeys({
      stackEvent: event.RequestType,
      deploymentId: event.PhysicalResourceId,
      deploymentStatus: resp.deploymentInfo?.status,
      rollbackStatus: rollbackResp?.deploymentInfo?.status
    });
    logger.info("Checking deployment");
    switch (event.RequestType) {
      case "Create":
      case "Update":
        switch (resp.deploymentInfo?.status) {
          case "Succeeded" /* SUCCEEDED */:
            logger.info("Deployment finished successfully", { complete: true });
            return { IsComplete: true };
          case "Failed" /* FAILED */:
          case "Stopped" /* STOPPED */:
            if (rollbackResp.deploymentInfo?.status) {
              if (rollbackResp.deploymentInfo?.status == "Succeeded" /* SUCCEEDED */ || rollbackResp.deploymentInfo?.status == "Failed" /* FAILED */ || rollbackResp.deploymentInfo?.status == "Stopped" /* STOPPED */) {
                const errInfo = resp.deploymentInfo.errorInformation;
                const error = new Error(`Deployment ${resp.deploymentInfo.status}: [${errInfo?.code}] ${errInfo?.message}`);
                logger.error("Deployment failed", { complete: true, error });
                throw error;
              }
              logger.info("Waiting for final status from a rollback", { complete: false });
              return { IsComplete: false };
            } else {
              const errInfo = resp.deploymentInfo.errorInformation;
              const error = new Error(`Deployment ${resp.deploymentInfo.status}: [${errInfo?.code}] ${errInfo?.message}`);
              logger.error("No rollback to wait for", { complete: true, error });
              throw error;
            }
          default:
            logger.info("Waiting for final status from deployment", { complete: false });
            return { IsComplete: false };
        }
      case "Delete":
        switch (resp.deploymentInfo?.status) {
          case "Succeeded" /* SUCCEEDED */:
            logger.info("Deployment finished successfully - nothing to delete", { complete: true });
            return { IsComplete: true };
          case "Failed" /* FAILED */:
          case "Stopped" /* STOPPED */:
            if (rollbackResp.deploymentInfo?.status) {
              if (rollbackResp.deploymentInfo?.status == "Succeeded" /* SUCCEEDED */ || rollbackResp.deploymentInfo?.status == "Failed" /* FAILED */ || rollbackResp.deploymentInfo?.status == "Stopped" /* STOPPED */) {
                logger.info("Rollback in final status", { complete: true });
                return { IsComplete: true };
              }
              logger.info("Waiting for final status from a rollback", { complete: false });
              return { IsComplete: false };
            }
            logger.info("No rollback to wait for", { complete: true });
            return { IsComplete: true };
          default:
            logger.info("Waiting for final status from deployment", { complete: false });
            return { IsComplete: false };
        }
      default:
        logger.error("Unknown request type");
        throw new Error(`Unknown request type: ${event.RequestType}`);
    }
  } catch (e) {
    logger.error("Unable to determine deployment status", { error: e });
    if (event.RequestType === "Delete") {
      logger.warn("Ignoring error - nothing to do", { complete: true });
      return { IsComplete: true };
    }
    throw e;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DeploymentStatus,
  handler
});
