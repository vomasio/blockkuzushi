// phina.js をグローバル領域に展開
phina.globalize();

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 960;
const MAX_PER_LINE =8;
const BLOCK_NUM = MAX_PER_LINE * 5;
const BLOCK_SIZE = 64;
const BOARD_PADDING = 50;
const PADDLE_WIDTH = 150;
const PADDLE_HEIGHT =32;
const BALL_RADIUS = 16;
let BALL_SPEED = 16;

const BOARD_SIZE = SCREEN_WIDTH - BOARD_PADDING * 2 ;
const BOARD_OFFSET_X = BOARD_PADDING + BLOCK_SIZE / 2;
const BOARD_OFFSET_Y = 150;


// MainScene クラスを定義
phina.define('MainScene', {
  superClass: 'DisplayScene',
  
  init: function(options) {
    this.superInit(options);
    
    //Score label
    this.scoreLabel = Label('0').addChildTo(this);
    this.scoreLabel.x = this.gridX.center();
    this.scoreLabel.y = this.gridY.span(1);
    this.scoreLabel.fill = 'white';
    
    //Group
    this.group = DisplayElement().addChildTo(this);
    
    const gridX = Grid(BOARD_SIZE, MAX_PER_LINE);
    const gridY = Grid(BOARD_SIZE, MAX_PER_LINE);
    
    let self = this;
    
    (BLOCK_NUM).times(function(i) {
        //index on grid
        let xIndex = i % MAX_PER_LINE;
        let yIndex = Math.floor(i / MAX_PER_LINE);
        let angle = (360) / BLOCK_NUM * i;
        let block = Block(angle).addChildTo(this.group).setPosition(100, 100);
        
        block.x = gridX.span(xIndex) + BOARD_OFFSET_X;
        block.y = gridY.span(yIndex) + BOARD_OFFSET_Y;
    }, this);
    
    //Ball
    this.ball = Ball().addChildTo(this);
    
    //Paddle
    this.paddle = Paddle().addChildTo(this);
    this.paddle.setPosition(this.gridX.center(), this.gridY.span(15));
    this.paddle.hold(this.ball);
    
    //ボールのスピード初期化
    this.ballSpeed = 0;
    //タッチでゲーム開始
    this.one('pointend', function() {
        this.paddle.release();
        this.ballSpeed = BALL_SPEED;
    });
    
    //スコア初期化
    this.score = 0;
    //タイム初期化
    this.time = 0;
    //コンボ初期化
    this.combo = 0;
  },
  
  update: function(app) {
      //タイム加算
      this.time += app.deltaTime;
      
      //パドル移動
      this.paddle.x = app.pointer.x;
      if(this.paddle.left < 0) {
          this.paddle.left = 0;
      }
      if(this.paddle.right > this.gridX.width) {
          this.paddle.right = this.gridX.width;
      }
      
      //スピードの数だけ、移動と衝突判定を繰り返す。（1進むごとに衝突判定）
      (this.ballSpeed).times(function() {
          this.ball.move();
          this.checkHit();
      }, this);
      
      //ブロックがすべてなくなった時クリア画面の関数呼ぶ
      if(this.group.children.length <= 0) {
          this.gameclear();
      }
  },
  //衝突判定
  checkHit: function() {
      let ball = this.ball;
      
      //画面外対応(壁の反射とかゲームオーバーとかの処理)
      if(ball.left < 0) {
          ball.left = 0;
          ball.reflectX();
      }
      if(ball.right > this.gridX.width) {
          ball.right = this.gridX.width;
          ball.reflectX();
      }
      if(ball.top < 0) {
          ball.top = 0;
          ball.reflectY();
      }
      if(ball.bottom > this.gridY.width) {
          ball.bottom = this.gridY.width;
          ball.reflectY();
          this.gameover();
      }
      
      //Ball and Paddle
      if(ball.hitTestElement(this.paddle)) {
          ball.bottom = this.paddle.top;
          
          let dx = ball.x - this.paddle.x;
          ball.direction.x = dx;
          ball.direction.y -80;
          ball.direction.normalize();
          
          //ballSpeed up
          this.ballSpeed +=1;
          
          //Reset combo
          this.combo = 0;
      }
      
      this.group.children.some(function(block) {
          //hit
          if(ball.hitTestElement(block)) {
              let dq = Vector2.sub(ball, block);
              
              if(Math.abs(dq.x) < Math.abs(dq.y)) {
                  ball.reflectY();
                  if(dq.y >= 0) {
                      ball.top = block.bottom;
                  }
                  else {
                      ball.bottom = block.top;
                  }
              }
              else {
                  ball.reflectX();
                  if(dq.x >= 0) {
                      ball.left = block.right;
                  }
                  else {
                      ball.right = block.left;
                  }
              }
              
              block.remove();
              
              this.combo += 1;
              this.score += this.combo * 100;
              
              let c = ComboLabel(this.combo).addChildTo(this);
              c.x = this.gridX.span(12) + Math.randint(-50, 50);
              c.y = this.gridY.span(12) + Math.randint(-50, 50);
              
              return true;
          }
      }, this);
  },
  
  gameclear: function() {
      //add clear bonus
      const bonus = 2000;
      this.score += bonus;
      
      //add time bonus
      const seconds = (this.time / 1000).floor();
      const bonusTime = Math.max(60 * 10 - seconds, 0);
      this.score += (bonusTime * 10);
      
      this.gameover();
  },
  
  gameover: function() {
      this.exit({
          score: this.score,
      });
  },
  
  _accessor: {
      score: {
          get: function() {
              return this._score;
          },
          set: function(v) {
              this._score = v;
              this.scoreLabel.text = v;
          },
      },
  }
  
});

//Block
phina.define('Block', {
    superClass: 'RectangleShape',
    
    init: function(angle) {
        this.superInit({
            width: BLOCK_SIZE,
            height: BLOCK_SIZE,
            fill: 'hsl({0}, 80%, 60%)'.format(angle || 0),
            stroke: null,
            cornerRadius: 8,
        });
    },
});

//Ball
phina.define('Ball', {
    superClass: 'CircleShape',
    
    init: function() {
        this.superInit({
            radius: BALL_RADIUS,
            fill: '#eee',
            stroke: null,
            cornerRadius: 8,
        });
        
        this.speed = 0;
        this.direction = Vector2(1, -1).normalize();
    },
    
    move: function() {
        this.x += this.direction.x;
        this.y += this.direction.y;
    },
    
    reflectX: function() {
        this.direction.x *= -1;
    },
    reflectY: function() {
        this.direction.y *= -1;
    },
});

//Paddle
phina.define('Paddle', {
    superClass: 'RectangleShape',
    
    init: function() {
        this.superInit({
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
            fill: '#eee',
            stroke: null,
            cornerRadius: 8,
        });
    },
    
    hold: function(ball) {
        this.ball = ball;
    },
    
    release: function() {
        this.ball = null;
        console.log("発射");
    },
    
    update: function() {
        if(this.ball) {
            this.ball.x = this.x;
            this.ball.y = this.top - this.ball.radius;
        }
    }
});

//ComboLabel
phina.define('ComboLabel', {
    superClass: 'Label',
    init: function(num) {
        this.superInit(num + ' combo');
        
        this.stroke = 'white';
        this.strokeWidth = 8;
        
        //数により色とサイズを分岐
        if(num < 5) {
            this.fill = 'hsl(40, 60%, 60%)';
            this.fontSize = 16;
        }
        else if(num < 10) {
            this.fill = 'hsl(120, 60%, 60%)';
            this.fontSize = 32;
        }
        else {
            this.fill = 'hsl(220, 60%, 60%)';
            this.fontSize = 48;
        }
        
        //フェードアウトして消えるやつ
        this.tweener
        .by({
            alpha: -1,
            y: -50,
        })
        .call(function() {
            this.remove();
        }, this);
    },
});

// メイン処理
phina.main(function() {
  // アプリケーション生成
  var app = GameApp({
      title: 'Blosher',
    startLabel: location.search.substr(1).toObject().scene || 'title',
    width: SCREEN_WIDTH,
    height:SCREEN_HEIGHT,
    backgroundColor: '#000',
    autoPause: true,
    debug: false,
  });
  // アプリケーション実行
  app.enableStats();
  app.run();
});