using Amazon.CDK;
using Amazon.CDK.AWS.ECS;

using Cdklabs.CdkEcsCodeDeploy;

using Constructs;

namespace EmptyAlarm;

public class EmptyAlarmStack : Stack
{
    internal EmptyAlarmStack(
        Construct scope,
        string id,
        IStackProps? props = null)
        : base(scope, id, props)
    {
        var taskDefinition = new FargateTaskDefinition(
            this,
            "TaskDefinition");

        taskDefinition.AddContainer(
            "Container",
            new ContainerDefinitionOptions {
                Image = ContainerImage.FromRegistry("nginx"),
                PortMappings = new IPortMapping[] {
                    new PortMapping {
                        ContainerPort = 80
                    }
                }
            });

        _ = new ApplicationLoadBalancedCodeDeployedFargateService(
            this,
            "Service",
            new ApplicationLoadBalancedCodeDeployedFargateServiceProps {
                TaskDefinition = taskDefinition
            });
    }
}