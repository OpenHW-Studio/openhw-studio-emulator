import os

def update_nand():
    path = "src/components/logic-nand-gate/ui.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("BOUNDS = { x: 0, y: 0, w: 70, h: 50 }", "BOUNDS = { x: 0, y: 0, w: 75, h: 60 }")
    content = content.replace('<svg width="70" height="50" viewBox="0 0 70 50"', '<svg width="75" height="60" viewBox="0 0 75 60"')
    
    content = content.replace('<line x1="0" y1="15" x2="20" y2="15"', '<line x1="0" y1="15" x2="20" y2="15"')
    content = content.replace('<line x1="0" y1="35" x2="20" y2="35"', '<line x1="0" y1="45" x2="20" y2="45"')
    
    content = content.replace('x1="20" y1="10" x2="55" y2="25"', 'x1="20" y1="10" x2="55" y2="30"')
    content = content.replace('d="M 20 10 L 40 10 A 15 15 0 0 1 40 40 L 20 40 Z"', 'd="M 20 10 L 40 10 A 20 20 0 0 1 40 50 L 20 50 Z"')
    
    content = content.replace('<circle cx="58" cy="25" r="3"', '<circle cx="63" cy="30" r="3"')
    content = content.replace('<line x1="61" y1="25" x2="70" y2="25"', '<line x1="66" y1="30" x2="75" y2="30"')
    
    with open(path, "w") as f:
        f.write(content)

def update_nor():
    path = "src/components/logic-nor-gate/ui.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("BOUNDS = { x: 0, y: 0, w: 70, h: 50 }", "BOUNDS = { x: 0, y: 0, w: 75, h: 60 }")
    content = content.replace('<svg width="70" height="50" viewBox="0 0 70 50"', '<svg width="75" height="60" viewBox="0 0 75 60"')
    
    content = content.replace('<line x1="0" y1="15" x2="22" y2="15"', '<line x1="0" y1="15" x2="22" y2="15"')
    content = content.replace('<line x1="0" y1="35" x2="22" y2="35"', '<line x1="0" y1="45" x2="22" y2="45"')
    
    content = content.replace('x1="20" y1="10" x2="55" y2="25"', 'x1="20" y1="10" x2="55" y2="30"')
    content = content.replace('d="M 20 10 Q 25 25 20 40 Q 40 40 55 25 Q 40 10 20 10 Z"', 'd="M 20 10 Q 25 30 20 50 Q 45 50 60 30 Q 45 10 20 10 Z"')
    
    content = content.replace('<circle cx="58" cy="25" r="3"', '<circle cx="63" cy="30" r="3"')
    content = content.replace('<line x1="61" y1="25" x2="70" y2="25"', '<line x1="66" y1="30" x2="75" y2="30"')
    
    with open(path, "w") as f:
        f.write(content)

def update_or():
    path = "src/components/logic-or-gate/ui.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("BOUNDS = { x: 0, y: 0, w: 70, h: 50 }", "BOUNDS = { x: 0, y: 0, w: 75, h: 60 }")
    content = content.replace('<svg width="70" height="50" viewBox="0 0 70 50"', '<svg width="75" height="60" viewBox="0 0 75 60"')
    
    content = content.replace('<line x1="0" y1="15" x2="22" y2="15"', '<line x1="0" y1="15" x2="22" y2="15"')
    content = content.replace('<line x1="0" y1="35" x2="22" y2="35"', '<line x1="0" y1="45" x2="22" y2="45"')
    
    content = content.replace('x1="20" y1="10" x2="55" y2="25"', 'x1="20" y1="10" x2="55" y2="30"')
    content = content.replace('d="M 20 10 Q 25 25 20 40 Q 40 40 55 25 Q 40 10 20 10 Z"', 'd="M 20 10 Q 25 30 20 50 Q 45 50 60 30 Q 45 10 20 10 Z"')
    
    content = content.replace('<line x1="55" y1="25" x2="70" y2="25"', '<line x1="60" y1="30" x2="75" y2="30"')
    
    with open(path, "w") as f:
        f.write(content)

def update_xor():
    path = "src/components/logic-xor-gate/ui.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("BOUNDS = { x: 0, y: 0, w: 70, h: 50 }", "BOUNDS = { x: 0, y: 0, w: 75, h: 60 }")
    content = content.replace('<svg width="70" height="50" viewBox="0 0 70 50"', '<svg width="75" height="60" viewBox="0 0 75 60"')
    
    content = content.replace('<line x1="0" y1="15" x2="17" y2="15"', '<line x1="0" y1="15" x2="17" y2="15"')
    content = content.replace('<line x1="0" y1="35" x2="17" y2="35"', '<line x1="0" y1="45" x2="17" y2="45"')
    
    content = content.replace('d="M 16 10 Q 21 25 16 40"', 'd="M 16 10 Q 21 30 16 50"')
    
    content = content.replace('x1="22" y1="10" x2="57" y2="25"', 'x1="22" y1="10" x2="57" y2="30"')
    content = content.replace('d="M 22 10 Q 27 25 22 40 Q 42 40 57 25 Q 42 10 22 10 Z"', 'd="M 22 10 Q 27 30 22 50 Q 47 50 62 30 Q 47 10 22 10 Z"')
    
    content = content.replace('<line x1="57" y1="25" x2="70" y2="25"', '<line x1="62" y1="30" x2="75" y2="30"')
    
    with open(path, "w") as f:
        f.write(content)

def update_xnor():
    path = "src/components/logic-xnor-gate/ui.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("BOUNDS = { x: 0, y: 0, w: 70, h: 50 }", "BOUNDS = { x: 0, y: 0, w: 75, h: 60 }")
    content = content.replace('<svg width="70" height="50" viewBox="0 0 70 50"', '<svg width="75" height="60" viewBox="0 0 75 60"')
    
    content = content.replace('<line x1="0" y1="15" x2="17" y2="15"', '<line x1="0" y1="15" x2="17" y2="15"')
    content = content.replace('<line x1="0" y1="35" x2="17" y2="35"', '<line x1="0" y1="45" x2="17" y2="45"')
    
    content = content.replace('d="M 16 10 Q 21 25 16 40"', 'd="M 16 10 Q 21 30 16 50"')
    
    content = content.replace('x1="22" y1="10" x2="57" y2="25"', 'x1="22" y1="10" x2="57" y2="30"')
    content = content.replace('d="M 22 10 Q 27 25 22 40 Q 42 40 57 25 Q 42 10 22 10 Z"', 'd="M 22 10 Q 27 30 22 50 Q 47 50 62 30 Q 47 10 22 10 Z"')
    
    content = content.replace('<circle cx="60" cy="25" r="3"', '<circle cx="65" cy="30" r="3"')
    content = content.replace('<line x1="63" y1="25" x2="70" y2="25"', '<line x1="68" y1="30" x2="75" y2="30"')
    
    with open(path, "w") as f:
        f.write(content)

def update_not():
    path = "src/components/logic-not-gate/ui.tsx"
    with open(path, "r") as f:
        content = f.read()
    
    content = content.replace("BOUNDS = { x: 0, y: 0, w: 70, h: 50 }", "BOUNDS = { x: 0, y: 0, w: 60, h: 30 }")
    content = content.replace('<svg width="70" height="50" viewBox="0 0 70 50"', '<svg width="60" height="30" viewBox="0 0 60 30"')
    
    content = content.replace('<line x1="0" y1="25" x2="20" y2="25"', '<line x1="0" y1="15" x2="20" y2="15"')
    
    content = content.replace('x1="20" y1="10" x2="50" y2="25"', 'x1="20" y1="0" x2="50" y2="15"')
    content = content.replace('points="20,10 50,25 20,40"', 'points="20,0 50,15 20,30"')
    
    content = content.replace('<circle cx="53" cy="25" r="3"', '<circle cx="53" cy="15" r="3"')
    content = content.replace('<line x1="56" y1="25" x2="70" y2="25"', '<line x1="56" y1="15" x2="60" y2="15"')
    
    with open(path, "w") as f:
        f.write(content)

update_nand()
update_nor()
update_or()
update_xor()
update_xnor()
update_not()

print("Updated ui.tsx files successfully!")
