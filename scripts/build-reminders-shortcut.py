"""Generate the importable iPhone automation with Apple's local signing tool."""
import pathlib
import plistlib
import subprocess
import tempfile
import uuid

root = pathlib.Path(__file__).resolve().parents[1]
actions = []

def action(name, **parameters):
    identifier = str(uuid.uuid4()).upper()
    actions.append({"WFWorkflowActionIdentifier": "is.workflow.actions." + name,
                    "WFWorkflowActionParameters": {**parameters, "UUID": identifier}})
    return {"WFSerializationType": "WFTextTokenAttachment",
            "Value": {"Type": "ActionOutput", "OutputUUID": identifier}}

def text(variable):
    return {"WFSerializationType": "WFTextTokenString",
            "Value": {"string": "\ufffc", "attachmentsByRange": {"{0, 1}": variable["Value"]}}}

def begin_if(value, condition):
    group = str(uuid.uuid4())
    action("conditional", GroupingIdentifier=group, WFControlFlowMode=0,
           WFCondition=condition, WFInput={"Type":"Variable","Variable":value})
    return group

def end_if(group):
    action("conditional", GroupingIdentifier=group, WFControlFlowMode=2)

source = action("url", WFURLActionURL="")
result = action("downloadurl", WFInput=source, WFHTTPMethod="GET")
def field(key):
    return action("getvalueforkey", WFInput=result, WFDictionaryKey=key, WFGetDictionaryValueType="Value")
title = field("title")
present = begin_if(title, 100)  # has any value
existing = action("filter.reminders", WFContentItemFilter={
    "Value":{"WFActionParameterFilterPrefix":1,"WFContentPredicateBoundedDate":False,
             "WFActionParameterFilterTemplates":[{"Property":"Title","Operator":4,"Unit":4,"VariableOverrides":{"stringValue":text(title)},"Removable":True}]},
    "WFSerializationType":"WFContentPredicateTableTemplate"}, WFContentItemLimitEnabled=True, WFContentItemLimitNumber=1)
missing = begin_if(existing, 101)  # has no value
notes = field("notes")
date = action("detect.date", WFInput=field("when"))
action("addnewreminder", WFCalendarItemTitle=text(title), WFCalendarItemNotes=text(notes),
       WFCalendarItemAlert=True, WFAlertTrigger="At Time", WFAlertCustomTime=text(date), ShowWhenRun=False)
end_if(missing)
end_if(present)
workflow = {"WFWorkflowClientVersion":"3030", "WFWorkflowMinimumClientVersion":900,
            "WFWorkflowIcon":{"WFWorkflowIconStartColor":4282601983,"WFWorkflowIconGlyphNumber":59771},
            "WFWorkflowActions":actions, "WFWorkflowTypes":[], "WFWorkflowInputContentItemClasses":[],
            "WFWorkflowImportQuestions":[{"ActionIndex":0,"Category":"Parameter","DefaultValue":"",
                "ParameterKey":"WFURLActionURL","Text":"Cole seu link pessoal para Lembretes, gerado pelo House Tasks."}]}
with tempfile.TemporaryDirectory() as folder:
    source_path = pathlib.Path(folder) / "House Tasks.shortcut"
    source_path.write_bytes(plistlib.dumps(workflow))
    subprocess.run(["shortcuts","sign","--mode","anyone","--input",str(source_path),
                    "--output",str(root/"assets"/"House-Tasks.shortcut")],check=True)
