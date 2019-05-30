var chip8_fontset =
[ 
    0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
    0x20, 0x60, 0x20, 0x20, 0x70, // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
    0x90, 0x90, 0xF0, 0x10, 0x10, // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
    0xF0, 0x10, 0x20, 0x40, 0x40, // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90, // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
    0xF0, 0x80, 0x80, 0x80, 0xF0, // C
    0xE0, 0x90, 0x90, 0x90, 0xE0, // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
    0xF0, 0x80, 0xF0, 0x80, 0x80  // F
];

var Chip8 = function()
{
    this.memory = new Uint8Array(4096);
    this.gfx = new Array(2048);
    this.key = new Uint8Array(16);
    this.opcode;
    this.pc;
                
    this.V = new Uint8Array(16);
    this.I;
                
    this.stack = new Uint16Array(16);
    this.sp;
                
    this.delayTimer;
    this.stackTimer;
    this.drawFlag;
};
            
Chip8.prototype.init = function()
{
    this.pc = 0x200;
    this.opcode = 0;
    this.I = 0;
    this.sp = 0;
    // Clear memory
    for(var i = 0; i < 4096; i++)
    {this.memory[i] = 0;}
    
    // Clear graphics
    for(var i = 0; i < 2048; i++)
    {this.gfx[i] = 0;}
    
    // Reset registers
    for(var i = 0; i < 16; i++)
    {this.V[i] = 0;}
    
    // Load fontset
    for(var i = 0; i < 80; i++)
    {this.memory[i] = chip8_fontset[i];}
    
    // Reset timers
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.drawFlag = true;
};

Chip8.prototype.emulateCycle = function()
{
    this.drawFlag = false;
    this.opcode = this.memory[this.pc] << 8 | this.memory[this.pc+1];
    var byte1 = this.memory[this.pc];
    var byte2 = this.memory[this.pc+1];
    // Excecute opcode
    switch(this.opcode & 0xF000)
    {
        case 0x0000:
            switch(this.opcode & 0x000F)
            {
                case 0x0:
                    for(var i = 0; i < 2048; i++)
                    {this.gfx[i] = 0;}
                    this.pc += 2;
                break;
                case 0xE:
                    this.pc = this.stack[this.sp];
                    this.sp--;
                break;
            }
        break;
        case 0x1000:
            this.pc = this.opcode & 0x0FFF;
        break;
        case 0x2000:
            this.stack[this.sp] = this.pc;
            this.sp++;
            this.pc = this.opcode & 0x0FFF;
        break;
        case 0x3000:
            if(this.V[byte1 & 0x0F] === byte2)
            {this.pc += 4;}
            else
            {this.pc += 2;}
        break;
        case 0x4000:
            if(this.V[byte1 & 0x0F] !== byte2)
            {this.pc += 4;}
            else
            {this.pc += 2;}
        break;
        case 0x5000:
            if(this.V[byte1 & 0x0F] === this.V[byte2 >> 4])
            {this.pc += 4;}
            else
            {this.pc += 2;}
        break;
        case 0x6000:
            this.V[byte1 & 0x0F] = byte2;
            this.pc += 2;
        break;
        case 0x7000:
            this.V[byte1 & 0x0F] += byte2;
            this.pc += 2;
        break;
        case 0x8000:
            switch(byte2 & 0x0F)
            {
                case 0x0:
                    this.V[byte1 & 0x0F] = this.V[byte2 >> 4];
                break;
                case 0x1:
                    this.V[byte1 & 0x0F] |= this.V[byte2 >> 4];
                break;
                case 0x2:
                    this.V[byte1 & 0x0F] &= this.V[byte2 >> 4];
                break;
                case 0x3:
                    this.V[byte1 & 0x0F] ^= this.V[byte2 >> 4];
                break;
                case 0x4:
                    this.V[byte1 & 0x0F] += this.V[byte2 >> 4];
                break;
                case 0x5:
                    if(this.V[byte2 >> 4] < this.V[byte1 & 0x0F])
                    {this.V[0xF] = 1;}
                    else
                    {this.V[0xF] = 0;}
                    this.V[byte1 & 0x0F] -= this.V[byte2 >> 4];
                break;
                case 0x6:
                    this.V[0xF] = this.V[byte1 & 0x0F] & 0x01;
                    this.V[byte1 & 0x0F] /= 2;
                break;
                case 0x7:
                    if(this.V[byte2 >> 4] > this.V[byte1 & 0x0F])
                    {this.V[0xF] = 1;}
                    else
                    {this.V[0xF] = 0;}
                    this.V[byte1 & 0x0F] = this.V[byte2 >> 4] - this.V[byte1 & 0x0F];
                break;
            }
            this.pc += 2;
        break;
    }
    // Update timers
    if(this.delayTimer > 0)
    {this.delayTimer--;}
    if(this.soundTimer > 0)
    {
        if(this.soundTimer === 1)
        {console.log("\a");}
        this.soundTimer--;
    }
};
