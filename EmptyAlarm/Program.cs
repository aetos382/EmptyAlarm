using Amazon.CDK;

using EmptyAlarm;

var app = new App();

_ = new EmptyAlarmStack(app, "EmptyAlarmStack", new StackProps
{
    Env = new Environment {
        Region = "ap-northeast-1"
    }
});

app.Synth();